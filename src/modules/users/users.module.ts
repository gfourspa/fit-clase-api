import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gym } from '../../entities/gym.entity';
import { User } from '../../entities/user.entity';
import { InvitationsModule } from '../invitations/invitations.module';
import { UsersController } from './users.controller';
import { UserService } from './users.service';

/**
 * Users Module
 *
 * Módulo que maneja la gestión de usuarios, incluyendo:
 * - Sincronización con Firebase Auth
 * - Gestión de roles y permisos
 * - Multi-tenant por gymId
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Gym]), InvitationsModule],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
