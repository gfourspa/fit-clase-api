import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { ClerkRolesGuard } from '../auth/guards/clerk-roles.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';
import { GymsService } from './gyms.service';

@ApiTags('Gimnasios')
@Controller('gyms')
@UseGuards(ClerkAuthGuard, ClerkRolesGuard)
@ApiBearerAuth()
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo gimnasio' })
  @ApiResponse({ status: 201, description: 'Gimnasio creado exitosamente' })
  create(@Body() createGymDto: CreateGymDto, @GetUser() user: User) {
    return this.gymsService.create(createGymDto, user.id);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos los gimnasios (solo super admin)' })
  @ApiResponse({ status: 200, description: 'Lista de gimnasios obtenida exitosamente' })
  findAll(@GetUser() user: User) {
    return this.gymsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener gimnasio por ID' })
  @ApiResponse({ status: 200, description: 'Gimnasio obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Gimnasio no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.gymsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar gimnasio' })
  @ApiResponse({ status: 200, description: 'Gimnasio actualizado exitosamente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGymDto: UpdateGymDto,
    @GetUser() user: User,
  ) {
    return this.gymsService.update(id, updateGymDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar gimnasio' })
  @ApiResponse({ status: 200, description: 'Gimnasio eliminado exitosamente' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.gymsService.remove(id, user);
  }
}