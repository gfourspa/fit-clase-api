import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvitationStatus } from '../../../common/enums';

export class InvitationResponseDto {
  /** The invitation UUID is also the token consumed by the client. */
  @ApiProperty({
    description: 'Invitation UUID and token used to accept the invitation',
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
    description: 'Expiration timestamp, if configured',
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: Date;
}
