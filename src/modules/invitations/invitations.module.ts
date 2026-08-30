import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gym } from '../../entities/gym.entity';
import { Invitation } from '../../entities/invitation.entity';
import { User } from '../../entities/user.entity';
import { InvitationEmailService } from './invitation-email.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, Gym, User])],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationEmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
