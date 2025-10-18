import { createClerkClient } from '@clerk/clerk-sdk-node';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Servicio para interactuar con la API de Clerk
 * Permite gestionar usuarios, sesiones y metadata desde el backend
 */
@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');

    if (!secretKey) {
      this.logger.warn(
        'CLERK_SECRET_KEY no está configurada. Algunas funcionalidades de administración no estarán disponibles.',
      );
    } else {
      this.clerkClient = createClerkClient({
        secretKey,
      });
      this.logger.log('Cliente de Clerk inicializado correctamente');
    }
  }

  /**
   * Obtiene información completa de un usuario por su ID
   */
  async getUserById(userId: string) {
    try {
      const user = await this.clerkClient.users.getUser(userId);
      return user;
    } catch (error) {
      this.logger.error(
        `Error al obtener usuario ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Actualiza el metadata público de un usuario
   * Este metadata es visible en el token JWT
   */
  async updateUserPublicMetadata(
    userId: string,
    metadata: Record<string, any>,
  ) {
    try {
      const user = await this.clerkClient.users.updateUser(userId, {
        publicMetadata: metadata,
      });
      this.logger.log(
        `Metadata público actualizado para usuario ${userId}`,
      );
      return user;
    } catch (error) {
      this.logger.error(
        `Error al actualizar metadata de usuario ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Actualiza el metadata privado de un usuario
   * Este metadata NO es visible en el token JWT
   */
  async updateUserPrivateMetadata(
    userId: string,
    metadata: Record<string, any>,
  ) {
    try {
      const user = await this.clerkClient.users.updateUser(userId, {
        privateMetadata: metadata,
      });
      this.logger.log(
        `Metadata privado actualizado para usuario ${userId}`,
      );
      return user;
    } catch (error) {
      this.logger.error(
        `Error al actualizar metadata privado de usuario ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Asigna un rol a un usuario en su metadata público
   */
  async assignRole(userId: string, role: string) {
    try {
      const user = await this.clerkClient.users.updateUser(userId, {
        publicMetadata: {
          role,
        },
      });
      this.logger.log(`Rol ${role} asignado al usuario ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Error al asignar rol al usuario ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Lista todos los usuarios
   */
  async listUsers(params?: {
    limit?: number;
    offset?: number;
    emailAddress?: string[];
  }) {
    try {
      const users = await this.clerkClient.users.getUserList(params);
      return users;
    } catch (error) {
      this.logger.error(`Error al listar usuarios: ${error.message}`);
      throw error;
    }
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(userId: string) {
    try {
      await this.clerkClient.users.deleteUser(userId);
      this.logger.log(`Usuario ${userId} eliminado`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar usuario ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Verifica un token de sesión
   */
  async verifyToken(token: string) {
    try {
      const sessionClaims = await this.clerkClient.verifyToken(token);
      return sessionClaims;
    } catch (error) {
      this.logger.error(`Error al verificar token: ${error.message}`);
      throw error;
    }
  }
}
