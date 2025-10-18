import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module';
import { TeachersController } from './teachers.controller';

@Module({
  imports: [ClassesModule],
  controllers: [TeachersController],
})
export class TeachersModule {}