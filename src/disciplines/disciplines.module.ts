import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discipline } from '../entities/discipline.entity';
import { DisciplinesService } from './disciplines.service';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline])],
  providers: [DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}