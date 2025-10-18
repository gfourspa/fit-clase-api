import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gym } from '../entities/gym.entity';
import { GymsController } from './gyms.controller';
import { GymsService } from './gyms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Gym])],
  controllers: [GymsController],
  providers: [GymsService],
  exports: [GymsService],
})
export class GymsModule {}