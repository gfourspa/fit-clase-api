import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../modules/auth/interfaces';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums'; /**
 * Roles Guard
 *
 * Valida que el usuario autenticado tenga uno de los roles requeridos.
 * También maneja la lógica multi-tenant basada en gymId.
 *
 * Reglas de acceso:
 * - SUPER_ADMIN: Acceso completo a todo el sistema
 * - OWNER_GYM: Acceso solo a recursos de su gimnasio
 * - TEACHER: Acceso solo a recursos de su gimnasio
 * - STUDENT: Acceso solo a recursos de su gimnasio
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener los roles requeridos del metadata del endpoint
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles especificados, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException(
        'Usuario no autenticado. Debe usar FirebaseAuthGuard antes que RolesGuard.'
      );
    }

    // Verificar si el usuario tiene uno de los roles requeridos
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Roles requeridos: ${requiredRoles.join(', ')}`
      );
    }

    // Validaciones adicionales multi-tenant
    return this.validateMultiTenantAccess(user, request);
  }

  /**
   * Valida el acceso multi-tenant basado en gymId
   */
  private validateMultiTenantAccess(user: AuthenticatedUser, request: Request): boolean {
    // SUPER_ADMIN tiene acceso a todo
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Para otros roles, validar gymId si está presente en el request
    const gymIdFromParams = request.params?.gymId;
    const gymIdFromBody = (request.body as any)?.gymId;
    const gymIdFromQuery = (request.query as any)?.gymId;
    
    // Si el endpoint especifica un gymId, debe coincidir con el del usuario
    const requestedGymId = gymIdFromParams || gymIdFromBody || gymIdFromQuery;
    
    if (requestedGymId && user.gymId !== requestedGymId) {
      throw new ForbiddenException(
        'Acceso denegado. No tiene permisos para este gimnasio.'
      );
    }

    // Validar que el usuario tenga un gymId asignado (excepto SUPER_ADMIN)
    if (!user.gymId) {
      throw new ForbiddenException(
        'Usuario sin gimnasio asignado. Contacte al administrador.'
      );
    }

    return true;
  }
}