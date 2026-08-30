import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InvitationStatus } from '../common/enums';
import { Gym } from './gym.entity';
import { User } from './user.entity';

@Entity('invitations')
@Index('UQ_invitations_pending_email_gym', ['gymId', 'email'], {
  unique: true,
  where: `"status" = 'PENDING'`,
})
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'gymId' })
  gym: Gym;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, select: false })
  tokenHash: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ type: 'uuid', nullable: true })
  usedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usedByUserId' })
  usedByUser: User | null;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
