import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Request } from 'express';
import { EntityManager } from 'typeorm';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { CustomException } from '@/common/exceptions/customs.exceptions';
import { User } from '../../entities/user.entity';
import { getFirebaseAdmin } from './firebase-admin.config';
import { AuthenticatedUser } from './interfaces';

/**
 * Firebase Authentication Guard
 *
 * Verifica el token de Firebase Auth y adjunta el usuario autoritativo del request.
 * El usuario se carga desde PostgreSQL usando el uid de Firebase como clave;
 * el token solo se usa para autenticar la identidad, no para autorizar roles
 * o membresías de gimnasio.
 *
 * El token debe enviarse en el header Authorization: Bearer <token>
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (isPublic) {
      // Si es un endpoint público sin token, permitir acceso anónimo.
      // Si hay token, adjuntar el usuario de forma opcional.
      if (!token) {
        return true;
      }
      // Continuar para adjuntar el usuario autenticado si el token es válido,
      // pero no fallar si no lo es.
      try {
        await this.attachUser(request, token);
      } catch {
        // Ignorar errores de token en endpoints públicos
      }
      return true;
    }

    if (!token) {
      throw CustomException.Unauthorized('Token de autenticación requerido');
    }

    try {
      await this.attachUser(request, token);
      return true;
    } catch (error) {
      this.logger.error('Error verificando token de Firebase:', error.message);
      throw CustomException.Unauthorized('Token de autenticación inválido');
    }
  }

  /**
   * Verifica el token de Firebase y adjunta el usuario al request.
   * Puede lanzar errores si el token es inválido.
   */
  private async attachUser(request: Request, token: string): Promise<void> {
    const admin = getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(token);

    // PostgreSQL es la fuente autoritativa para rol y membresía de gimnasio.
    const dbUser = await this.entityManager.findOne(User, {
      where: { firebase_uid: decodedToken.uid },
    });

    const user: AuthenticatedUser = {
      uid: decodedToken.uid,
      id: dbUser?.id,
      email: dbUser?.email ?? decodedToken.email,
      firebaseEmail: decodedToken.email,
      emailVerified: decodedToken.email_verified === true,
      name: dbUser?.name ?? decodedToken.name,
      role: dbUser?.role ?? undefined,
      gymId: dbUser?.gymId ?? undefined,
      iat: decodedToken.iat,
      exp: decodedToken.exp,
    };

    (request as any).user = user;
  }

  /**
   * Extrae el token del header Authorization
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
