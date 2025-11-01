import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initializeFirebaseAdmin } from './modules/auth/firebase-admin.config';

async function bootstrap() {
  // Inicializar Firebase Admin SDK
  try {
    initializeFirebaseAdmin();
    console.log('Firebase Admin SDK inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando Firebase Admin SDK:', error.message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Obtener configuración
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 4000;
  const corsOrigin = configService.get('CORS_ORIGIN') || 'http://localhost:3000';

  // Seguridad
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
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

  await app.listen(port);

  console.log(`🚀 Servidor ejecutándose en: http://localhost:${port}`);
  console.log(`📚 Documentación disponible en: http://localhost:${port}/api/docs`);
  console.log(`🔍 Health check en: http://localhost:${port}/api/v1/health`);
}

bootstrap();
