import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ReservationStatus } from '../common/enums';
import { Class } from './class.entity';
import { User } from './user.entity';

@Entity('reservations')
@Index('IDX_reservations_active_class_student', ['classId', 'studentId'], {
  unique: true,
  where: "status = 'RESERVED'",
})
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  classId: string;

  @Column({ type: 'uuid' })
  studentId: string; // User UUID (Firebase User)

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Class, (classEntity) => classEntity.reservations)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => User, (user) => user.reservations)
  @JoinColumn({ name: 'studentId' })
  student: User;
}
