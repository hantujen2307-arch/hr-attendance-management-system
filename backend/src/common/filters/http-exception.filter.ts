import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Check if a message or error string contains sensitive backend/database details.
   */
  private isSensitive(str: string): boolean {
    const sensitivePatterns = [
      /prisma/i,
      /postgres/i,
      /sql/i,
      /unique constraint/i,
      /foreign key constraint/i,
      /database error/i,
      /connect\s+econ/i,
      /connection\s+refused/i,
      /\bat\s+[\w\d_./\\-]+\s+\(/i, // Stack trace lines
      /password/i,
      /jwt_secret/i,
      /secret/i,
      /\/Users\//i,
      /\/home\//i,
    ];
    return sensitivePatterns.some((pattern) => pattern.test(str));
  }

  /**
   * Sanitize error message to prevent database details or secrets leakage.
   */
  private sanitizeMessage(message: any): any {
    if (typeof message === 'string') {
      if (this.isSensitive(message)) {
        return 'Terjadi kesalahan pada pemrosesan permintaan.';
      }
      return message;
    }

    if (Array.isArray(message)) {
      return message.map((m) => (typeof m === 'string' && this.isSensitive(m) ? 'Format data tidak valid.' : m));
    }

    return 'Terjadi kesalahan pada pemrosesan permintaan.';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Terjadi kesalahan internal pada server.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = this.sanitizeMessage(res);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = this.sanitizeMessage(obj.message || message);
        error = obj.error || error;
      }
    } else {
      // Non-HttpException (e.g. database error, unexpected runtime exception)
      const err = exception as any;

      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${err?.message || err}`,
        err?.stack,
      );

      // Handle specific known error codes safely
      if (err?.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Data yang dimasukkan sudah ada di sistem (duplikat).';
        error = 'Conflict';
      } else if (err?.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Data yang diminta tidak ditemukan.';
        error = 'Not Found';
      } else if (err?.type === 'entity.too.large' || err?.status === 413 || err?.statusCode === 413) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'Ukuran berkas atau foto selfie melebihi batas maksimal yang diperbolehkan (maksimal 10MB).';
        error = 'Payload Too Large';
      } else {
        // Strict sanitization: never expose raw database exceptions, table names, or stacks
        message = 'Terjadi kesalahan internal pada server.';
        error = 'Internal Server Error';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

