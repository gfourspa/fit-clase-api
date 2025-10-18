import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { ClerkUser } from './clerk-auth.guard';

/**
 * Guard para validar roles de usuario basados en metadata de Clerk
 * Este guard debe usarse DESPUÉS de ClerkAuthGuard
 */
@Injectable()
export class ClerkRolesGuard implements CanActivate {
  private readonly logger = new Logger(ClerkRolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos desde el decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ClerkUser = request.user;

    if (!user) {
      this.logger.warn(
        'ClerkRolesGuard: No se encontró usuario en la request. Asegúrate de usar ClerkAuthGuard antes.',
      );
      throw new ForbiddenException(
        'No se pudo verificar la autenticación del usuario',
      );
    }

    // Obtener el rol del usuario desde publicMetadata de Clerk
    const userRole = user.publicMetadata?.role as Role;

    if (!userRole) {
      this.logger.warn(
        `Usuario ${user.userId} no tiene rol asignado en publicMetadata`,
      );
      throw new ForbiddenException(
        'No tienes un rol asignado. Contacta al administrador.',
      );
    }

    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      this.logger.warn(
        `Usuario ${user.userId} (${user.email}) con rol ${userRole} intentó acceder a recurso que requiere: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
      );
    }

    this.logger.debug(
      `Usuario ${user.email} autorizado con rol ${userRole} para acceder a recurso que requiere: ${requiredRoles.join(', ')}`,
    );

    return true;
  }
}
