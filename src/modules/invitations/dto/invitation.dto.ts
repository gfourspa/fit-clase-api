import {
  IsEmail,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  gymId!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  expiresInHours?: number;
}

export class AcceptInvitationDto {
  @IsUUID()
  invitationToken!: string;
}
