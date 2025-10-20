import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Discipline } from './discipline.entity';
import { Gym } from './gym.entity';
import { Reservation } from './reservation.entity';
import { User } from './user.entity';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  gymId: string;

  @Column({ type: 'uuid' })
  disciplineId: string;

  @Column({ type: 'varchar', length: 255 })
  teacherId: string; // Clerk User ID

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'int' })
  capacity: number;

  @ManyToOne(() => Gym, (gym) => gym.classes)
  @JoinColumn({ name: 'gymId' })
  gym: Gym;

  @ManyToOne(() => Discipline, (discipline) => discipline.classes)
  @JoinColumn({ name: 'disciplineId' })
  discipline: Discipline;

  @ManyToOne(() => User, (user) => user.classesTaught)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @OneToMany(() => Reservation, (reservation) => reservation.class)
  reservations: Reservation[];
}