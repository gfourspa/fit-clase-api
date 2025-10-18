import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

export interface ClerkUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  publicMetadata?: {
    role?: string;
    [key: string]: any;
  };
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private jwksClient: jwksClient.JwksClient;

  constructor(private configService: ConfigService) {
    const jwksUrl = this.configService.get<string>('CLERK_JWKS_URL');
    
    if (!jwksUrl) {
      throw new Error(
        'CLERK_JWKS_URL no está configurada. Por favor, configura esta variable en tu archivo .env',
      );
    }

    // Cliente JWKS para obtener las claves públicas de Clerk
    this.jwksClient = jwksClient.default({
      jwksUri: jwksUrl,
      cache: true,
      cacheMaxAge: 600000, // 10 minutos
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No se encontró token en la cabecera Authorization');
      throw new UnauthorizedException(
        'No se proporcionó token de autenticación. Por favor, incluye el header: Authorization: Bearer <token>',
      );
    }

    try {
      // Decodificar el token sin verificar para obtener el kid (Key ID)
      const decodedToken = jwt.decode(token, { complete: true });

      if (!decodedToken || typeof decodedToken === 'string') {
        throw new UnauthorizedException('Token JWT inválido o malformado');
      }

      const { header } = decodedToken;

      if (!header.kid) {
        throw new UnauthorizedException('Token JWT sin Key ID (kid)');
      }

      // Obtener la clave pública usando el kid
      const signingKey = await this.getSigningKey(header.kid);

      // Verificar el token con la clave pública
      const verifiedPayload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
      }) as any;

      // Extraer información del usuario del token de Clerk
      const clerkUser: ClerkUser = {
        userId: verifiedPayload.sub, // El subject contiene el user ID de Clerk
        email: verifiedPayload.email || verifiedPayload.email_addresses?.[0],
        firstName: verifiedPayload.given_name || verifiedPayload.first_name,
        lastName: verifiedPayload.family_name || verifiedPayload.last_name,
        imageUrl: verifiedPayload.picture || verifiedPayload.image_url,
        publicMetadata: verifiedPayload.public_metadata || {},
      };

      // Añadir el usuario a la request para que esté disponible en los controladores
      request.user = clerkUser;

      this.logger.debug(
        `Usuario autenticado: ${clerkUser.email} (${clerkUser.userId})`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error al validar token de Clerk: ${error.message}`,
        error.stack,
      );

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(
          'El token ha expirado. Por favor, inicia sesión nuevamente.',
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(
          `Token inválido: ${error.message}. Verifica que estés usando un token válido de Clerk.`,
        );
      }

      throw new UnauthorizedException(
        'Error al validar el token de autenticación. Por favor, verifica tus credenciales.',
      );
    }
  }

  /**
   * Extrae el token JWT del header Authorization
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      this.logger.warn(
        `Formato de Authorization header inválido. Esperado: "Bearer <token>", recibido: "${authHeader}"`,
      );
      return undefined;
    }

    return token;
  }

  /**
   * Obtiene la clave pública de firma desde el JWKS endpoint de Clerk
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error(
        `Error al obtener la clave de firma con kid=${kid}: ${error.message}`,
      );
      throw new UnauthorizedException(
        'No se pudo verificar el token. Clave de firma no encontrada.',
      );
    }
  }
}
