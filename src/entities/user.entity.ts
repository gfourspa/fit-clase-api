import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '../common/enums';
import { Class } from './class.entity';
import { Gym } from './gym.entity';
import { Reservation } from './reservation.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['firebase_uid'], { unique: true })
export class User {
  @PrimaryColumn({ type: 'uuid' })
  id: string; // UUID generado automáticamente

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  firebase_uid: string | null; // Firebase User UID

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STUDENT,
  })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  gymId: string | null;

  @ManyToOne(() => Gym, (gym) => gym.users, { nullable: true })
  @JoinColumn({ name: 'gymId' })
  gym: Gym;

  @OneToMany(() => Gym, (gym) => gym.owner)
  ownedGyms: Gym[];

  @OneToMany(() => Class, (classEntity) => classEntity.teacher)
  classesTaught: Class[];

  @OneToMany(() => Reservation, (reservation) => reservation.student)
  reservations: Reservation[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}