import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { join, resolve } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure body parsers with 15MB limit for base64 camera selfies and receipts
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

  // Apply Helmet HTTP security headers (allow cross-origin for uploaded media)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Keep disabled for Swagger UI and local development
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Ensure upload directories exist on server filesystem
  const uploadDirs = [
    join(__dirname, '..', 'public', 'uploads'),
    join(__dirname, '..', 'uploads'),
    resolve(process.cwd(), 'public', 'uploads'),
    resolve(process.cwd(), 'uploads'),
  ];

  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // ignore errors
      }
    }
  }

  // Static options with CORS and CORP headers for cross-origin image embedding
  const staticOptions = {
    setHeaders: (res: any) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  };

  // Serve static assets publicly under /uploads prefix
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(resolve(process.cwd(), 'public', 'uploads'), {
    prefix: '/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(resolve(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    ...staticOptions,
  });

  // Also mount under /api/uploads prefix in case client uses API prefix
  app.useStaticAssets(join(__dirname, '..', 'public', 'uploads'), {
    prefix: '/api/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/api/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(resolve(process.cwd(), 'public', 'uploads'), {
    prefix: '/api/uploads/',
    ...staticOptions,
  });
  app.useStaticAssets(resolve(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
    ...staticOptions,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Trust upstream reverse proxy (Nginx, Traefik, AWS ALB, Caddy, Cloudflare)
  // for accurate client IP detection in rate-limiting, audit logs, and GPS checks
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Enable graceful shutdown hooks for SIGTERM / SIGINT
  app.enableShutdownHooks();

  // Register Global Exception Filter for sanitized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS with flexible origin policy (supports localhost and Vercel deployments)
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configure Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('HR & Attendance Management System API')
    .setDescription(
      'Enterprise REST API documentation for HR, Employee, Attendance, Leave, and Shift management',
    )
    .setVersion('1.0')
    .addTag('Authentication', 'Login and token session management')
    .addTag('Health Check', 'Service and database readiness probes')
    .addTag('Employees', 'Manage staff records and profiles')
    .addTag('Departments', 'Organizational units and members')
    .addTag('Attendance', 'Daily attendance logs and clock-in records')
    .addTag('Leave Management', 'Time-off requests, balances, and approvals')
    .addTag('Shifts', 'Operational shifts and work rosters')
    .addTag('Dashboard', 'Real-time aggregated workforce metrics')
    .addTag('Reports & Analytics', 'Attendance metrics and departmental insights')
    .addTag('Users', 'System user accounts')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token generated from /api/auth/login',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 5001;
  await app.listen(port);

  console.log(`🚀 NestJS Backend is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger Documentation is available at: http://localhost:${port}/api/docs`);
}

bootstrap();
