import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus, Role } from '../../../common/enums';

export class InvitationResponseDto {
  @ApiProperty({
    description: 'Invitation audit UUID; it is not the acceptance token',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Gym UUID associated with the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  gymId!: string;

  @ApiProperty({ description: 'Invited email', example: 'student@example.com' })
  email!: string;

  @ApiProperty({ enum: InvitationStatus, description: 'Invitation status' })
  status!: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Expiration timestamp',
  })
  expiresAt!: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}

export class InvitationDeliveryResponseDto extends InvitationResponseDto {
  @ApiProperty({ description: 'Opaque token returned only on creation/resend' })
  invitationToken!: string;

  @ApiProperty({ description: 'Link sent to the invited student' })
  acceptanceUrl!: string;

  @ApiProperty({ description: 'Whether the email provider accepted the email' })
  emailSent!: boolean;
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  uid!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ format: 'uuid' })
  gymId!: string;

  @ApiProperty()
  idempotent!: boolean;

  @ApiProperty({ description: 'Whether Firebase custom claims were updated' })
  claimsUpdated!: boolean;
}

export class ValidateInvitationResponseDto {
  @ApiProperty({
    description: 'Invitation audit UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Gym UUID associated with the invitation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  gymId!: string;

  @ApiProperty({ description: 'Invited email', example: 'student@example.com' })
  email!: string;

  @ApiProperty({ enum: InvitationStatus, description: 'Invitation status' })
  status!: InvitationStatus;

  @ApiProperty({ description: 'Expiration timestamp' })
  expiresAt!: Date;
}
