import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { ClerkService } from './clerk.service';
import type { ClerkUser } from './guards/clerk-auth.guard';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkRolesGuard } from './guards/clerk-roles.guard';

@ApiTags('Autenticación con Clerk')
@Controller('auth')
export class AuthController {
  constructor(private clerkService: ClerkService) {}

  /**
   * Endpoint público para verificar el estado del servidor
   */
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servidor de autenticación' })
  @ApiResponse({ status: 200, description: 'Servidor funcionando correctamente' })
  health() {
    return {
      status: 'ok',
      message: 'Autenticación con Clerk activa',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtener perfil del usuario autenticado
   * Requiere token JWT de Clerk
   */
  @Get('profile')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil del usuario obtenido correctamente',
    schema: {
      example: {
        userId: 'user_2abc123xyz',
        email: 'usuario@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        imageUrl: 'https://img.clerk.com/...',
        publicMetadata: {
          role: 'STUDENT'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Token inválido o no proporcionado' })
  getProfile(@GetUser() user: ClerkUser) {
    return {
      message: 'Perfil obtenido correctamente',
      user,
    };
  }

  /**
   * Endpoint solo para SUPER_ADMIN
   * Muestra cómo proteger rutas con roles específicos
   */
  @Get('admin/dashboard')
  @UseGuards(ClerkAuthGuard, ClerkRolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dashboard de administrador (solo SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Dashboard obtenido correctamente' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos de SUPER_ADMIN' })
  adminDashboard(@GetUser() user: ClerkUser) {
    return {
      message: 'Bienvenido al panel de administración',
      user: {
        userId: user.userId,
        email: user.email,
        role: user.publicMetadata?.role,
      },
      stats: {
        totalUsers: 150,
        activeClasses: 45,
        totalReservations: 320,
      },
    };
  }

  /**
   * Endpoint para ADMIN o SUPER_ADMIN
   * Muestra cómo permitir múltiples roles
   */
  @Get('management/users')
  @UseGuards(ClerkAuthGuard, ClerkRolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar usuarios (ADMIN o SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida' })
  @ApiResponse({ status: 403, description: 'Requiere rol de ADMIN o SUPER_ADMIN' })
  async listUsers(@GetUser() user: ClerkUser) {
    try {
      const users = await this.clerkService.listUsers({ limit: 10 });
      return {
        message: 'Usuarios obtenidos correctamente',
        requestedBy: {
          userId: user.userId,
          email: user.email,
          role: user.publicMetadata?.role,
        },
        users: Array.isArray(users) ? users.map(u => ({
          id: u.id,
          email: u.emailAddresses[0]?.emailAddress,
          firstName: u.firstName,
          lastName: u.lastName,
          createdAt: u.createdAt,
        })) : [],
        pagination: {
          total: Array.isArray(users) ? users.length : 0,
        },
      };
    } catch (error) {
      return {
        error: 'Error al obtener usuarios',
        message: error.message,
      };
    }
  }

  /**
   * Asignar rol a un usuario (solo SUPER_ADMIN)
   */
  @Patch('admin/assign-role')
  @UseGuards(ClerkAuthGuard, ClerkRolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar rol a un usuario (solo SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Rol asignado correctamente' })
  @ApiResponse({ status: 403, description: 'Solo SUPER_ADMIN puede asignar roles' })
  async assignRole(
    @Body() body: { userId: string; role: Role },
    @GetUser() currentUser: ClerkUser,
  ) {
    try {
      await this.clerkService.assignRole(body.userId, body.role);
      return {
        message: 'Rol asignado correctamente',
        assignedBy: {
          userId: currentUser.userId,
          email: currentUser.email,
        },
        targetUser: body.userId,
        newRole: body.role,
      };
    } catch (error) {
      return {
        error: 'Error al asignar rol',
        message: error.message,
      };
    }
  }
}
