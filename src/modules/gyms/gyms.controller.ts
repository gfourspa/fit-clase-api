import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';
import { GymResponseDto } from './dto/gym-response.dto';
import { GymMapper } from './gym.mapper';
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
  @ApiCreatedResponse({ type: GymResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGymDto: CreateGymDto, @Request() req: any) {
    const user = req.user;
    const gym = await this.gymsService.create(createGymDto, user.uid);
    return GymMapper.toResponse(gym);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los gimnasios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de gimnasios obtenida exitosamente',
  })
  @ApiOkResponse({ type: [GymResponseDto] })
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req: any) {
    const user = req.user;
    const gyms = await this.gymsService.findAll(user);
    return gyms.map((gym) => GymMapper.toResponse(gym));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener gimnasio por ID' })
  @ApiResponse({ status: 200, description: 'Gimnasio obtenido exitosamente' })
  @ApiResponse({ status: 404, description: 'Gimnasio no encontrado' })
  @ApiOkResponse({ type: GymResponseDto })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    const gym = await this.gymsService.findOne(id, user);
    return GymMapper.toResponse(gym);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Actualizar gimnasio' })
  @ApiResponse({
    status: 200,
    description: 'Gimnasio actualizado exitosamente',
  })
  @ApiOkResponse({ type: GymResponseDto })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGymDto: UpdateGymDto,
    @Request() req: any,
  ) {
    const user = req.user;
    const gym = await this.gymsService.update(id, updateGymDto, user);
    return GymMapper.toResponse(gym);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Eliminar gimnasio' })
  @ApiResponse({
    status: 204,
    description: 'Gimnasio eliminado exitosamente',
    schema: { type: 'string', example: '' },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.gymsService.remove(id, user);
  }
}
