// MUST be the first import — patches Node.js modules before NestJS loads them
import './tracing';

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { initializeFirebaseAdmin } from './modules/auth/firebase-admin.config';

function validateRequiredConfig(configService: ConfigService): void {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missing = required.filter((key) => {
    const value = configService.get<string>(key);
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
    process.exit(1);
  }
}

function validateInvitationConfig(configService: ConfigService): void {
  const acceptUrl = configService.get<string>('INVITATION_ACCEPT_URL');
  const isProduction = configService.get('NODE_ENV') === 'production';

  if (!acceptUrl) {
    if (isProduction) {
      console.error(
        'INVITATION_ACCEPT_URL is required in production. Example: https://api.example.com/api/v1/invitations/accept',
      );
      process.exit(1);
    }
    console.warn(
      'INVITATION_ACCEPT_URL not set. Invitation emails will use a placeholder URL.',
    );
    return;
  }

  try {
    const url = new URL(acceptUrl);
    if (url.protocol !== 'https:' && isProduction) {
      console.error(
        'INVITATION_ACCEPT_URL must use HTTPS in production.',
      );
      process.exit(1);
    }
  } catch {
    console.error(
      `INVITATION_ACCEPT_URL is not a valid URL: ${acceptUrl}`,
    );
    process.exit(1);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Obtener configuración y validar variables requeridas antes de iniciar
  const configService = app.get(ConfigService);
  validateRequiredConfig(configService);
  validateInvitationConfig(configService);

  // Inicializar Firebase Admin SDK
  try {
    initializeFirebaseAdmin();
    console.log('Firebase Admin SDK inicializado correctamente');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error inicializando Firebase Admin SDK:', msg);
    process.exit(1);
  }

  // Limitar tamaño de los cuerpos de las peticiones para mitigar consumo excesivo de recursos
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  const port = configService.get('PORT') || 4000;
  const corsOrigin =
    configService.get('CORS_ORIGIN') || 'http://localhost:3000';
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
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
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
    .addTag(
      'Autenticación',
      'Endpoints para registro, login y perfil de usuario',
    )
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

  // Render requiere que la aplicación escuche en 0.0.0.0
  await app.listen(port, '0.0.0.0');

  // Graceful shutdown para SIGTERM/SIGINT
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Closing HTTP server...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  console.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
  if (configService.get('NODE_ENV') !== 'production') {
    console.log(
      `📚 Documentación disponible en: http://localhost:${port}/api/docs`,
    );
  }
  console.log(`🔍 Health check en: http://localhost:${port}/api/v1/health`);
}

bootstrap();
