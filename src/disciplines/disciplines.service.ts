import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discipline } from '../entities/discipline.entity';

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private disciplineRepository: Repository<Discipline>,
  ) {}

  async findAll(): Promise<Discipline[]> {
    return this.disciplineRepository.find();
  }

  async findOne(id: string): Promise<Discipline | null> {
    return this.disciplineRepository.findOne({ where: { id } });
  }
}