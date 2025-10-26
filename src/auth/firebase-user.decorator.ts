import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/firebase-auth.guard';

/**
 * Decorador para obtener el usuario autenticado desde Firebase
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@FirebaseUser() user: AuthenticatedUser) {
 *   return { uid: user.uid, email: user.email, role: user.role };
 * }
 * ```
 */
export const FirebaseUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    // Si se especifica una propiedad, retornar solo esa propiedad
    if (data) {
      return user?.[data];
    }

    // Retornar el usuario completo
    return user;
  },
);