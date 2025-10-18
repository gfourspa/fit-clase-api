import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discipline } from '../entities/discipline.entity';
import { Gym } from '../entities/gym.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Gym, Discipline])],
  providers: [],
})
export class DatabaseModule {}