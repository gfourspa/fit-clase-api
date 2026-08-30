import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público, permitiendo el acceso sin autenticación.
 * El FirebaseAuthGuard debe estar configurado para respetar este metadata.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
