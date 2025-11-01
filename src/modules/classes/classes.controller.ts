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
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createClassDto: CreateClassDto, @Request() req: any) {
    const user = req.user;
    return this.classesService.create(createClassDto, user);
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
  @HttpCode(HttpStatus.OK)
  findAll(@Query() filterDto: FilterClassDto, @Request() req: any) {
    const user = req.user;
    return this.classesService.findAll(filterDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener clase por ID' })
  @ApiResponse({ status: 200, description: 'Clase obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Clase no encontrada' })
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.classesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Actualizar clase' })
  @ApiResponse({ status: 200, description: 'Clase actualizada exitosamente' })
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.classesService.update(id, updateClassDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.OWNER_GYM)
  @ApiOperation({ summary: 'Eliminar clase' })
  @ApiResponse({ status: 204, description: 'Clase eliminada exitosamente' })
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
  getTeacherClasses(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    const user = req.user;
    return this.classesService.findByTeacher(id, user);
  }
}
