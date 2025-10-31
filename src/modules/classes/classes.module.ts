import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../../entities/class.entity';
import { Discipline } from '../../entities/discipline.entity';
import { Gym } from '../../entities/gym.entity';
import { User } from '../../entities/user.entity';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Class, User, Gym, Discipline])],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}