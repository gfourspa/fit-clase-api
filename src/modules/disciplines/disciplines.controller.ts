import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards
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
import { Discipline } from '../../entities/discipline.entity';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { FirebaseUser } from '../auth/firebase-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces';
import { DisciplinesService } from './disciplines.service';
import { CreateDisciplineDto, FilterDisciplineDto, UpdateDisciplineDto } from './dto/discipline.dto';


/**
 * Disciplines Controller
 * 
 * Maneja los endpoints CRUD de disciplinas deportivas.
 * Las disciplinas están asociadas a un gimnasio específico.
 * 
 */
@ApiTags('Disciplinas')
@Controller('disciplines')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  /**
   * POST /disciplines
   * Crear una nueva disciplina
   * Solo OWNER_GYM y SUPER_ADMIN
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nueva disciplina',
    description: 'Crea una nueva disciplina asociada a un gimnasio. Solo OWNER_GYM y SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 201,
    description: 'Disciplina creada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o disciplina ya existe',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  @ApiResponse({
    status: 404,
    description: 'Gimnasio no encontrado',
  })
  async create(
    @Body() createDisciplineDto: CreateDisciplineDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<Discipline> {
    return this.disciplinesService.create(createDisciplineDto,user);
  }

  /**
   * GET /disciplines
   * Obtener todas las disciplinas con filtros opcionales
   * Accesible para todos los usuarios autenticados
   */
  @Get()
  @ApiOperation({
    summary: 'Listar todas las disciplinas',
    description: 'Obtiene todas las disciplinas con filtros opcionales (gymId, name)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de disciplinas obtenida exitosamente',
  })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() filters: FilterDisciplineDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<Discipline[]> {
    return this.disciplinesService.findAll(filters,user);
  }

  /**
   * GET /disciplines/:id
   * Obtener una disciplina específica por ID
   * Accesible para todos los usuarios autenticados
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener disciplina por ID',
    description: 'Obtiene los detalles de una disciplina específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Disciplina encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Disciplina no encontrada',
  })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Discipline> {
    return this.disciplinesService.findOne(id);
  }

  /**
   * GET /disciplines/gym/:gymId
   * Obtener todas las disciplinas de un gimnasio
   * Accesible para todos los usuarios autenticados
   */
  @Get('gym/:gymId')
  @ApiOperation({
    summary: 'Obtener disciplinas por gimnasio',
    description: 'Obtiene todas las disciplinas de un gimnasio específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Disciplinas del gimnasio obtenidas exitosamente',
  })
  @HttpCode(HttpStatus.OK)
  async findByGym(@Param('gymId') gymId: string): Promise<Discipline[]> {
    return this.disciplinesService.findByGymId(gymId);
  }

  /**
   * PATCH /disciplines/:id
   * Actualizar una disciplina
   * Solo OWNER_GYM (del gimnasio) y SUPER_ADMIN
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Actualizar disciplina',
    description: 'Actualiza los datos de una disciplina. Solo OWNER_GYM y SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Disciplina actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  @ApiResponse({
    status: 404,
    description: 'Disciplina no encontrada',
  })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<Discipline> {
    return this.disciplinesService.update(id, updateDisciplineDto, user);
  }

  /**
   * DELETE /disciplines/:id
   * Eliminar una disciplina (soft delete)
   * Solo OWNER_GYM (del gimnasio) y SUPER_ADMIN
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.OWNER_GYM, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar disciplina',
    description: 'Elimina una disciplina. Solo OWNER_GYM y SUPER_ADMIN.',
  })
  @ApiResponse({
    status: 204,
    description: 'Disciplina eliminada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar porque tiene clases asociadas',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  @ApiResponse({
    status: 404,
    description: 'Disciplina no encontrada',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @FirebaseUser() user: AuthenticatedUser,
  ): Promise<void> {

    return this.disciplinesService.remove(id, user);
  }
}


