import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ClerkUser } from '../../auth/guards/clerk-auth.guard';

/**
 * Decorador para obtener el usuario autenticado por Clerk
 * Uso: @GetUser() user: ClerkUser
 */
export const GetUser = createParamDecorator(
  (data: keyof ClerkUser | undefined, ctx: ExecutionContext): ClerkUser | any => {
    const request = ctx.switchToHttp().getRequest();
    const user: ClerkUser = request.user;

    // Si se especifica una propiedad, retornar solo esa propiedad
    if (data) {
      return user?.[data];
    }

    // Retornar el usuario completo
    return user;
  },
);
