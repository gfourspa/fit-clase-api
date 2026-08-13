import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import {
  Class,
  Discipline,
  Gym,
  Invitation,
  Reservation,
  User,
} from '../entities';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  entities: [User, Gym, Discipline, Class, Reservation, Invitation],
  migrations: [
    join(__dirname, '..', 'database', 'migrations', '*.js'),
    join(__dirname, '..', 'database', 'migrations', '*.ts'),
  ],
  migrationsRun: false,
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: configService.get('NODE_ENV') === 'development',
  ssl:
    configService.get('DB_SSL') === 'true'
      ? { rejectUnauthorized: true }
      : false,
});
