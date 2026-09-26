import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function sanitizeDatabaseUrl(rawUrl?: string): string | undefined {
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

const sanitizedUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (sanitizedUrl && sanitizedUrl !== process.env.DATABASE_URL) {
  process.env.DATABASE_URL = sanitizedUrl;
}

const sanitizedDirectUrl = sanitizeDatabaseUrl(process.env.DIRECT_URL);
if (sanitizedDirectUrl && sanitizedDirectUrl !== process.env.DIRECT_URL) {
  process.env.DIRECT_URL = sanitizedDirectUrl;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: sanitizedUrl ? { db: { url: sanitizedUrl } } : undefined,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Connected to PostgreSQL database successfully.');
    } catch (err: any) {
      this.logger.warn(
        `⚠️ Initial DB connection attempt failed (possible Neon cold-start). Retrying in 2 seconds... Error: ${err?.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        await this.$connect();
        this.logger.log('✅ Connected to PostgreSQL database on retry attempt.');
      } catch (retryErr: any) {
        this.logger.error('❌ Failed to connect to database after retry:', retryErr?.message);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
