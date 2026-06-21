// MUST be the first import — patches Node.js modules before NestJS loads them
import './tracing';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { initializeFirebaseAdmin } from './modules/auth/firebase-admin.config';

async function bootstrap() {
  // Inicializar Firebase Admin SDK
  try {
    initializeFirebaseAdmin();
    console.log('Firebase Admin SDK inicializado correctamente');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error inicializando Firebase Admin SDK:', msg);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Obtener configuración
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 4000;
  const corsOrigin = configService.get('CORS_ORIGIN') || 'http://localhost:3000';
  const allowedOrigins = corsOrigin.split(',').map((o: string) => o.trim());

  // Seguridad — CSP configurado para permitir los assets de Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:', 'https://swagger.io'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
    }),
  );

  // CORS — valida origen contra lista blanca definida en CORS_ORIGIN
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permitir requests sin origen (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not allowed by CORS`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Manejador global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validación global con mensajes de error unificados
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}),
        );
        return new BadRequestException(messages);
      },
    }),
  );

  // Prefijo global para la API
  app.setGlobalPrefix('api/v1');

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('FitClase API')
    .setDescription('API REST para sistema de reservas de clases deportivas')
    .setVersion('1.0')
    .addTag('Autenticación', 'Endpoints para registro, login y perfil de usuario')
    .addTag('Gimnasios', 'CRUD de gimnasios')
    .addTag('Clases', 'CRUD de clases deportivas')
    .addTag('Reservas', 'Gestión de reservas de clases')
    .addTag('Salud', 'Endpoints de estado del servidor')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Only expose Swagger UI in non-production environments
  if (configService.get('NODE_ENV') !== 'production') {
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'FitClase API Documentation',
      customfavIcon: 'https://swagger.io/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });
  }

  await app.listen(port);

  console.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
  if (configService.get('NODE_ENV') !== 'production') {
    console.log(`📚 Documentación disponible en: http://localhost:${port}/api/docs`);
  }
  console.log(`🔍 Health check en: http://localhost:${port}/api/v1/health`);
}

bootstrap();
