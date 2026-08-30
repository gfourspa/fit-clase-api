import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums';

/**
 * DTO para asignar rol a un usuario
 */
export class AssignRoleDto {
  @IsString()
  @MaxLength(255)
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
 * La membresía al gimnasio se obtiene de una invitación previamente creada por OWNER_GYM/SUPER_ADMIN.
 */
export class AutoAssignStudentDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  invitationToken!: string;
}

/**
 * DTO para agregar usuarios a un gimnasio por email
 */
export class AddUsersToGymDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50, { message: 'No puedes agregar más de 50 emails por solicitud' })
  @IsEmail({}, { each: true })
  @MaxLength(255, { each: true })
  emails!: string[];
}

/**
 * DTO para crear un nuevo usuario
 */
export class CreateUserDto {
  @IsString()
  @MaxLength(255)
  firebase_uid!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  gymId?: string;
}
