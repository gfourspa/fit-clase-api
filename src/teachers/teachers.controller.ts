import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { ClerkRolesGuard } from '../auth/guards/clerk-roles.guard';
import { ClassesService } from '../classes/classes.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { User } from '../entities/user.entity';

@ApiTags('Profesores')
@Controller('teachers')
@UseGuards(ClerkAuthGuard, ClerkRolesGuard)
@ApiBearerAuth()
export class TeachersController {
  constructor(private readonly classesService: ClassesService) {}

  @Get(':id/classes')
  @Roles(Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener clases de un profesor' })
  @ApiResponse({ status: 200, description: 'Lista de clases del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  getTeacherClasses(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.classesService.findByTeacher(id, user);
  }
}