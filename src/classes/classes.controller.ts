import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { ClerkRolesGuard } from '../auth/guards/clerk-roles.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';
import { ClassesService } from './classes.service';
import { CreateClassDto, FilterClassDto, UpdateClassDto } from './dto/class.dto';

@ApiTags('Clases')
@Controller('classes')
@UseGuards(ClerkAuthGuard, ClerkRolesGuard)
@ApiBearerAuth()
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Crear una nueva clase' })
  @ApiResponse({ status: 201, description: 'Clase creada exitosamente' })
  create(@Body() createClassDto: CreateClassDto, @GetUser() user: User) {
    return this.classesService.create(createClassDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clases con filtros opcionales' })
  @ApiQuery({ name: 'date', required: false, description: 'Filtrar por fecha (YYYY-MM-DD)' })
  @ApiQuery({ name: 'disciplineId', required: false, description: 'Filtrar por disciplina' })
  @ApiQuery({ name: 'gymId', required: false, description: 'Filtrar por gimnasio' })
  @ApiQuery({ name: 'page', required: false, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, description: 'Elementos por página' })
  @ApiResponse({ status: 200, description: 'Lista de clases obtenida exitosamente' })
  findAll(@Query() filterDto: FilterClassDto, @GetUser() user: User) {
    return this.classesService.findAll(filterDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener clase por ID' })
  @ApiResponse({ status: 200, description: 'Clase obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Clase no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.classesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar clase' })
  @ApiResponse({ status: 200, description: 'Clase actualizada exitosamente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassDto: UpdateClassDto,
    @GetUser() user: User,
  ) {
    return this.classesService.update(id, updateClassDto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar clase' })
  @ApiResponse({ status: 200, description: 'Clase eliminada exitosamente' })
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.classesService.remove(id, user);
  }
}