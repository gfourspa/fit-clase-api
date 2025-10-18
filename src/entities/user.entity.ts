import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../common/enums';
import { Class } from './class.entity';
import { Gym } from './gym.entity';
import { Reservation } from './reservation.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // Campo password obsoleto - Ahora usamos Clerk para autenticación
  // Se mantiene por compatibilidad con registros existentes pero no se usa
  @Column({ type: 'varchar', length: 255, nullable: true, default: '' })
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.STUDENT,
  })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  gymId: string;

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
}