import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health Check')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Application health status' })
  @ApiResponse({ status: 200, description: 'Application is running smoothly' })
  checkHealth() {
    return { status: 'ok' };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (process is running)' })
  @ApiResponse({ status: 200, description: 'Application process is alive' })
  checkLive() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (ready to receive traffic)' })
  @ApiResponse({ status: 200, description: 'Application is ready and database is connected' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async checkReady() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        ready: true,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        ready: false,
        message: 'Could not connect to PostgreSQL database',
      });
    }
  }

  @Get('database')
  @ApiOperation({ summary: 'Database connectivity health check' })
  @ApiResponse({ status: 200, description: 'PostgreSQL database connection is healthy' })
  @ApiResponse({ status: 503, description: 'Database connection failed' })
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        message: 'Could not connect to PostgreSQL database',
      });
    }
  }
}
