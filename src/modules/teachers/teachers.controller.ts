import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ClassesService } from '../classes/classes.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Profesores')
@Controller('teachers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TeachersController {
  constructor(private readonly classesService: ClassesService) {}

  @Get(':id/classes')
  @Roles(Role.TEACHER, Role.OWNER_GYM, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener clases de un profesor' })
  @ApiResponse({ status: 200, description: 'Lista de clases del profesor' })
  @ApiResponse({ status: 404, description: 'Profesor no encontrado' })
  getTeacherClasses(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const user = req.user;
    return this.classesService.findByTeacher(id, user);
  }
}