import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Salud')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servidor' })
  @ApiResponse({ status: 200, description: 'Servidor funcionando correctamente' })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Mensaje de bienvenida' })
  @ApiResponse({ status: 200, description: 'Mensaje de bienvenida' })
  getHello(): { message: string } {
    return {
      message: 'Bienvenido a la API de FitClase - Sistema de reservas deportivas',
    };
  }
}
