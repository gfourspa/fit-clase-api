import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { getDatabaseConfig } from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { GymsModule } from './gyms/gyms.module';
import { ReservationsModule } from './reservations/reservations.module';
import { TeachersModule } from './teachers/teachers.module';

@Module({
  imports: [
    // Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Base de datos
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto
      limit: 100, // 100 requests por minuto
    }]),

    // Módulos de la aplicación
    AuthModule,
    GymsModule,
    ClassesModule,
    ReservationsModule,
    TeachersModule,
    DisciplinesModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
