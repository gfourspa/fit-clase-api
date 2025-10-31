import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';
import { GymsService } from './gyms.service';

@ApiTags('Gimnasios')
@Controller('gyms')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Crear un nuevo gimnasio' })
  @ApiResponse({ status: 201, description: 'Gimnasio creado exitosamente' })
  create(@Body() createGymDto: CreateGymDto, @Request() req: any) {
    const user = req.user;
    return this.gymsService.create(createGymDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los gimnasios' })
  @ApiResponse({ status: 200, description: 'Lista de gimnasios obtenida exitosamente' })
  findAll(@Request() req: any) {
    const user = req.user;
    return this.gymsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener gimnasio por ID' })
  @ApiResponse({ status: 200, description: 'Gimnasio obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Gimnasio no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.gymsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Actualizar gimnasio' })
  @ApiResponse({ status: 200, description: 'Gimnasio actualizado exitosamente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGymDto: UpdateGymDto,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.gymsService.update(id, updateGymDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Eliminar gimnasio' })
  @ApiResponse({ status: 200, description: 'Gimnasio eliminado exitosamente' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.gymsService.remove(id, user);
  }
}