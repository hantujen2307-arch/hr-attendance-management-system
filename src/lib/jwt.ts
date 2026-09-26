import crypto from 'crypto';

const JWT_SECRET =
  process.env.JWT_SECRET || 'hr-attendance-management-super-secure-jwt-secret-2026';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  [key: string]: any;
}

export function signJwt(
  payload: TokenPayload,
  expiresInSeconds: number = 86400
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encode = (data: any) =>
    Buffer.from(JSON.stringify(data)).toString('base64url');

  const encodedHeader = encode(header);
  const encodedPayload = encode(fullPayload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

export function verifyJwt(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(dataToSign)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload: TokenPayload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAuthUser(request: { cookies: { get: (name: string) => { value: string } | undefined }; headers: { get: (name: string) => string | null } }): TokenPayload | null {
  const token =
    request.cookies.get('access_token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;
  return verifyJwt(token);
}
