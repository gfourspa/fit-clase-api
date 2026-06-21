import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '../../../common/enums';

/**
 * DTO para asignar rol a un usuario
 */
export class AssignRoleDto {
  @IsString()
  uid!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsUUID()
  gymId?: string;
}

/**
 * DTO para auto-asignar rol STUDENT desde Flutter
 * El uid y email se ignoran del body; se extraen del token Firebase para evitar suplantación.
 */
export class AutoAssignStudentDto {
  @IsOptional()
  @IsString()
  uid?: string;

  @IsOptional() 
  @IsUUID()
  gymId?: string;
}

/**
 * DTO para crear un nuevo usuario
 */
export class CreateUserDto {
  @IsString()
  firebase_uid!: string;

  @IsEmail()
  email!: string;

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