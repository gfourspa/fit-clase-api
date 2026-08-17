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
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ClassesService } from './classes.service';
import {
  CreateClassDto,
  FilterClassDto,
  UpdateClassDto,
} from './dto/class.dto';
import {
  ClassListResponseDto,
  ClassResponseDto,
} from './dto/class-response.dto';
import { ClassMapper } from './class.mapper';

@ApiTags('Clases')
@Controller('classes')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Crear una nueva clase' })
  @ApiResponse({ status: 201, description: 'Clase creada exitosamente' })
  @ApiCreatedResponse({ type: ClassResponseDto })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createClassDto: CreateClassDto, @Request() req: any) {
    const user = req.user;
    const created = await this.classesService.create(createClassDto, user);
    const classEntity = await this.classesService.findOne(created.id, user);
    return ClassMapper.toResponse(classEntity);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clases con filtros opcionales' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filtrar por fecha (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'disciplineId',
    required: false,
    description: 'Filtrar por disciplina',
  })
  @ApiQuery({
    name: 'gymId',
    required: false,
    description: 'Filtrar por gimnasio',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Elementos por página',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clases obtenida exitosamente',
  })
  @ApiOkResponse({ type: ClassListResponseDto })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() filterDto: FilterClassDto, @Request() req: any) {
    const user = req.user;
    const result = await this.classesService.findAll(filterDto, user);
    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      classes: result.classes.map((classEntity) =>
        ClassMapper.toResponse(classEntity),
      ),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener clase por ID' })
  @ApiResponse({ status: 200, description: 'Clase obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Clase no encontrada' })
  @ApiOkResponse({ type: ClassResponseDto })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    const classEntity = await this.classesService.findOne(id, user);
    return ClassMapper.toResponse(classEntity);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Actualizar clase' })
  @ApiResponse({ status: 200, description: 'Clase actualizada exitosamente' })
  @ApiOkResponse({ type: ClassResponseDto })
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Request() req: any,
  ) {
    const user = req.user;
    await this.classesService.update(id, updateClassDto, user);
    const classEntity = await this.classesService.findOne(id, user);
    return ClassMapper.toResponse(classEntity);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Eliminar clase' })
  @ApiResponse({
    status: 204,
    description: 'Clase eliminada exitosamente',
    schema: { type: 'string', example: '' },
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.classesService.remove(id, user);
  }

  @Get(':id/teacher-classes')
  @Roles(Role.TEACHER, Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener clases de un profesor' })
  @ApiResponse({ status: 200, description: 'Lista de clases del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  @ApiOkResponse({ type: [ClassResponseDto] })
  async getTeacherClasses(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const user = req.user;
    const classes = await this.classesService.findByTeacher(id, user);
    return classes.map((classEntity) => ClassMapper.toResponse(classEntity));
  }
}
