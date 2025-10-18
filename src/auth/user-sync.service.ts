import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';
import { ClerkWebhookUserData, SyncUserDto } from './dto/clerk-webhook.dto';

/**
 * Servicio para sincronizar usuarios de Clerk con la base de datos local
 * 
 * Este servicio maneja la sincronización desde Clerk a la base de datos local:
 * - Clerk → DB Local (vía webhooks o script manual)
 */
@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Sincroniza un usuario de Clerk con la base de datos local
   * Si el usuario ya existe, lo actualiza. Si no existe, lo crea.
   * 
   * @param clerkUserId - ID del usuario en Clerk
   * @param email - Email del usuario
   * @param name - Nombre completo del usuario
   * @param role - Rol del usuario (de publicMetadata)
   * @param imageUrl - URL de la imagen de perfil
   */
  async syncUser(data: SyncUserDto): Promise<User> {
    const { clerkUserId, email, name, role, imageUrl } = data;

    try {
      // Buscar usuario existente por email o clerkUserId
      let user = await this.userRepository.findOne({
        where: [{ email }, { id: clerkUserId }],
      });

      if (user) {
        // Actualizar usuario existente
        user.name = name;
        user.email = email;
        if (role && Object.values(Role).includes(role as Role)) {
          user.role = role as Role;
        }
        
        this.logger.log(`Usuario actualizado: ${email} (${clerkUserId})`);
      } else {
        // Crear nuevo usuario
        user = this.userRepository.create({
          id: clerkUserId, // Usar el ID de Clerk como ID local
          name,
          email,
          password: '', // Password vacío - auth manejada por Clerk
          role: (role && Object.values(Role).includes(role as Role)) 
            ? (role as Role) 
            : Role.STUDENT, // Role por defecto
        });

        this.logger.log(`Nuevo usuario creado: ${email} (${clerkUserId})`);
      }

      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(
        `Error sincronizando usuario ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Sincroniza un usuario desde un evento de webhook de Clerk
   */
  async syncUserFromWebhook(userData: ClerkWebhookUserData): Promise<User> {
    const primaryEmail = userData.email_addresses.find(
      (e) => e.id === userData.primary_email_address_id,
    );

    if (!primaryEmail) {
      throw new Error('Usuario sin email primario');
    }

    const name = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || primaryEmail.email_address;

    return this.syncUser({
      clerkUserId: userData.id,
      email: primaryEmail.email_address,
      name,
      role: userData.public_metadata?.role,
      imageUrl: userData.image_url,
    });
  }

  /**
   * Elimina o desactiva un usuario cuando se elimina en Clerk
   */
  async handleUserDeleted(clerkUserId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: clerkUserId },
      });

      if (user) {
        // Opción 1: Soft delete (recomendado para mantener historial)
        await this.userRepository.softDelete(clerkUserId);
        
        // Opción 2: Hard delete (descomentar si prefieres eliminación completa)
        // await this.userRepository.delete(clerkUserId);

        this.logger.log(`Usuario eliminado: ${user.email} (${clerkUserId})`);
      }
    } catch (error) {
      this.logger.error(
        `Error eliminando usuario ${clerkUserId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Verifica si un usuario existe en la base de datos local
   */
  async userExists(clerkUserId: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { id: clerkUserId },
    });
    return count > 0;
  }
}
