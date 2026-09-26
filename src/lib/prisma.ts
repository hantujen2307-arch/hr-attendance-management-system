import { PrismaClient } from '@prisma/client';

/**
 * Sanitizes and repairs database connection URLs for Neon PostgreSQL.
 * Handles common copy-paste truncation errors (e.g. "ap-southeast-:" -> "ap-southeast-1.aws.neon.tech:"),
 * ensures required SSL mode, and configures appropriate connection timeouts for serverless cold starts.
 */
export function sanitizeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  let url = rawUrl.trim();

  // 1. Auto-heal truncated Neon hostnames where "1.aws.neon.tech" was cut off
  if (url.includes('ap-southeast-:')) {
    url = url.replace('ap-southeast-:', 'ap-southeast-1.aws.neon.tech:');
  } else if (url.includes('.c-4.ap-southeast-') && !url.includes('.aws.neon.tech')) {
    url = url.replace(/(\.c-4\.ap-southeast-)(?::|\/)/, '$11.aws.neon.tech$2');
  }

  // 2. Ensure sslmode=require for Neon PostgreSQL
  if (url.includes('neon.tech') && !url.includes('sslmode=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sslmode=require`;
  }

  // 3. Add connect_timeout to allow Neon compute cold-starts to complete (default 5s is too short)
  if (url.includes('neon.tech') && !url.includes('connect_timeout=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}connect_timeout=15`;
  }

  return url;
}

// Ensure process.env.DATABASE_URL and DIRECT_URL are sanitized in memory
const sanitizedDatabaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (sanitizedDatabaseUrl && sanitizedDatabaseUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizedDatabaseUrl;
}

const sanitizedDirectUrl = sanitizeDatabaseUrl(process.env.DIRECT_URL);
if (sanitizedDirectUrl && sanitizedDirectUrl !== process.env.DIRECT_URL) {
  process.env.DIRECT_URL = sanitizedDirectUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: sanitizedDatabaseUrl ? { db: { url: sanitizedDatabaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Executes a Prisma database query with automatic retry for transient errors
 * such as Neon cold starts (P1001, P1002, connection timeouts, reset connections).
 */
export async function withDbRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await queryFn();
    } catch (err: any) {
      attempt++;
      const isTransient = isTransientDatabaseError(err);
      if (isTransient && attempt <= maxRetries) {
        console.warn(
          `⚠️ [Prisma Retry] Transient database error detected (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms... Reason:`,
          err?.message || err
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Checks whether an error is transient (e.g. Neon cold-start, unreachable server, socket timeout)
 */
export function isTransientDatabaseError(err: any): boolean {
  if (!err) return false;
  const message = String(err.message || '');
  const code = String(err.code || '');

  return (
    code === 'P1001' || // Can't reach database server
    code === 'P1002' || // Database server timed out
    code === 'P1008' || // Operations timed out
    code === 'P1017' || // Server has closed connection
    message.includes("Can't reach database server") ||
    message.includes('cold start') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ECONNRESET') ||
    message.includes('EHOSTUNREACH') ||
    message.includes('Connection terminated') ||
    message.includes('Connection pool timeout')
  );
}

/**
 * Formats a database error into a safe, informative user-facing message in Indonesian.
 * Prevents raw Prisma internals, credentials, or hostnames from leaking to the UI.
 */
export function formatDatabaseError(err: any, fallbackMessage: string = 'Terjadi kesalahan sistem.'): {
  message: string;
  isColdStart: boolean;
  code?: string;
} {
  const isColdStart = isTransientDatabaseError(err);
  const code = err?.code;

  if (isColdStart) {
    return {
      message:
        'Layanan database sedang aktif kembali (cold-start) atau koneksi timeout. Mohon tunggu beberapa detik lalu coba kembali.',
      isColdStart: true,
      code,
    };
  }

  if (code === 'P2002') {
    return {
      message: 'Data dengan informasi ini sudah ada di sistem (duplikasi unik).',
      isColdStart: false,
      code,
    };
  }

  if (code === 'P2025') {
    return {
      message: 'Data yang dicari tidak ditemukan atau telah dihapus.',
      isColdStart: false,
      code,
    };
  }

  return {
    message: fallbackMessage,
    isColdStart: false,
    code,
  };
}
