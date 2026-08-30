import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  gymId!: string;

  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ default: 72, minimum: 1, maximum: 720 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}

export class AcceptInvitationDto {
  @ApiPropertyOptional({
    description: 'Opaque token received in the invitation link (legacy field)',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  invitationToken?: string;

  @ApiPropertyOptional({
    description: 'Opaque token received in the invitation link',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  token?: string;
}

export class ValidateInvitationQueryDto {
  @ApiProperty({ description: 'Opaque token received in the invitation link' })
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  token!: string;
}

export class ResendInvitationDto {
  @ApiPropertyOptional({ default: 72, minimum: 1, maximum: 720 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}
