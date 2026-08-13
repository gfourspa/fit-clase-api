import 'dotenv/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import {
  Class,
  Discipline,
  Gym,
  Invitation,
  Reservation,
  User,
} from '../entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Gym, Discipline, Class, Reservation, Invitation],
  migrations: [
    join(__dirname, 'migrations', '*.js'),
    join(__dirname, 'migrations', '*.ts'),
  ],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
