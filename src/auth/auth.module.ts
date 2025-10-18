import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { ClerkService } from './clerk.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkRolesGuard } from './guards/clerk-roles.guard';
import { UserSyncService } from './user-sync.service';

/**
 * Módulo de autenticación con Clerk
 * 
 * Características:
 * - Validación JWT mediante JWKS
 * - Autorización basada en roles (publicMetadata)
 * - Sincronización de usuarios vía webhooks
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]), // Para sincronización de usuarios
  ],
  controllers: [
    AuthController,
    ClerkWebhookController, // Webhooks para sincronización
  ],
  providers: [
    ClerkAuthGuard,
    ClerkRolesGuard,
    ClerkService,
    UserSyncService, // Servicio de sincronización
  ],
  exports: [
    ClerkAuthGuard,
    ClerkRolesGuard,
    ClerkService,
    UserSyncService,
  ],
})
export class AuthModule {}