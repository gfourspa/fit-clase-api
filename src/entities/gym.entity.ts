import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { User } from './user.entity';

@Entity('gyms')
export class Gym {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  contact: string;

  @Column({ type: 'varchar', length: 255 })
  ownerId: string; // Clerk User ID

  @ManyToOne(() => User, (user) => user.ownedGyms)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => Class, (classEntity) => classEntity.gym)
  classes: Class[];

  @OneToMany(() => User, (user) => user.gym)
  users: User[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}