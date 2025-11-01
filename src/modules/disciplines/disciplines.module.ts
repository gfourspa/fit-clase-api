import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discipline } from '../../entities/discipline.entity';
import { Gym } from '../../entities/gym.entity';
import { DisciplinesController } from './disciplines.controller';
import { DisciplinesService } from './disciplines.service';

/**
 * Disciplines Module
 * 
 * Módulo que maneja el CRUD completo de disciplinas deportivas.
 * Las disciplinas están asociadas a un gimnasio específico.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Discipline, Gym])],
  controllers: [DisciplinesController],
  providers: [DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}