/**
 * Interface para el usuario autenticado extraído del token de Firebase
 * Representa los datos del usuario después de pasar por el FirebaseAuthGuard
 */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  gymId?: string;
  /** Timestamp de cuando se emitió el token */
  iat?: number;
  exp?: number;
  /** claims personalizados que pueda tener el token */
  [key: string]: any;
}
