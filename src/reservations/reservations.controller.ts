import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { ClerkRolesGuard } from '../auth/guards/clerk-roles.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';
import { CreateReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservas')
@Controller('reservations')
@UseGuards(ClerkAuthGuard, ClerkRolesGuard)
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Crear una nueva reserva' })
  @ApiResponse({ status: 201, description: 'Reserva creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en los datos o cupos agotados' })
  create(@Body() createReservationDto: CreateReservationDto, @GetUser() user: User) {
    return this.reservationsService.create(createReservationDto, user);
  }

  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Obtener mis reservas' })
  @ApiResponse({ status: 200, description: 'Lista de reservas del usuario' })
  findMyReservations(@GetUser() user: User) {
    return this.reservationsService.findMyReservations(user);
  }

  @Delete(':id')
  @Roles(Role.STUDENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancelar una reserva' })
  @ApiResponse({ status: 200, description: 'Reserva no encontrada' })
  @ApiResponse({ status: 404, description: 'Reserva no encontrada' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.reservationsService.cancel(id, user);
  }

  @Put('classes/:classId/attendance')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Marcar asistencia de un estudiante' })
  @ApiResponse({ status: 200, description: 'Asistencia marcada exitosamente' })
  markAttendance(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('studentId', ParseUUIDPipe) studentId: string,
    @Query('attended', ParseBoolPipe) attended: boolean,
    @GetUser() user: User,
  ) {
    return this.reservationsService.markAttendance(classId, studentId, attended, user);
  }
}