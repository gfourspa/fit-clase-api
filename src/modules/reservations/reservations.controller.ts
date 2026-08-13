import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservas')
@Controller('reservations')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Crear una nueva reserva' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @Request() req: any,
  ) {
    const user = req.user;
    const reservation = await this.reservationsService.create(
      createReservationDto,
      user,
    );
    return ReservationResponseDto.fromEntity(reservation);
  }

  @Get('my-reservations')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Obtener mis reservas' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del usuario' })
  @HttpCode(HttpStatus.OK)
  async findMyReservations(@Request() req: any) {
    const user = req.user;
    const reservations =
      await this.reservationsService.findMyReservations(user);
    return reservations.map((reservation) =>
      ReservationResponseDto.fromEntity(reservation),
    );
  }

  @Put(':id/cancel')
  @Roles(Role.STUDENT, Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancelar una reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada exitosamente' })
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    const reservation = await this.reservationsService.cancel(id, user);
    return ReservationResponseDto.fromEntity(reservation);
  }

  @Put(':classId/students/:studentId/attendance')
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Marcar asistencia a clase' })
  @ApiResponse({ status: 200, description: 'Asistencia marcada exitosamente' })
  @HttpCode(HttpStatus.OK)
  async markAttendance(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('attended', ParseBoolPipe) attended: boolean,
    @Request() req: any,
  ) {
    const user = req.user;
    const reservation = await this.reservationsService.markAttendance(
      classId,
      studentId,
      attended,
      user,
    );
    return ReservationResponseDto.fromEntity(reservation);
  }
}
