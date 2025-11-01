import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '../../../common/enums';

/**
 * DTO para asignar rol a un usuario
 */
export class AssignRoleDto {
  @IsString()
  uid: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  gymId?: string;
}

/**
 * DTO para auto-asignar rol STUDENT desde Flutter
 */
export class AutoAssignStudentDto {
  @IsString()
  uid: string;

  @IsString()
  email: string;

  @IsOptional() 
  @IsUUID()
  gymId?: string;
}

/**
 * DTO para crear un nuevo usuario
 */
export class CreateUserDto {
  @IsString()
  firebase_uid: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  gymId?: string;
}