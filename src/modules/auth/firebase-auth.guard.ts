import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger
} from '@nestjs/common';
import { Request } from 'express';
import { CustomException } from 'src/common/exceptions/customs.exceptions';
import { getFirebaseAdmin } from './firebase-admin.config';
import { AuthenticatedUser } from './interfaces';

/**
 * Firebase Authentication Guard
 * 
 * Verifica el token de Firebase Auth y adjunta el usuario decodificado al request.
 * El token debe enviarse en el header Authorization: Bearer <token>
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {

  private readonly logger = new Logger(FirebaseAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw CustomException.Unauthorized('Token de autenticación requerido');
    }

    try {
      const admin = getFirebaseAdmin();
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Adjuntar el usuario decodificado al request
      (request as any).user = {
        ...decodedToken,
        role: decodedToken.role,
        gymId: decodedToken.gymId,
      } as AuthenticatedUser;

      return true;
    } catch (error) { 
      this.logger.error('Error verificando token de Firebase:', error.message);
      throw CustomException.Unauthorized('Token de autenticación inválido');
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}