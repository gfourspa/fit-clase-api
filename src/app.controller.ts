import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto, WelcomeResponseDto } from './dto/app-response.dto';

@ApiTags('Salud')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servidor' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Mensaje de bienvenida' })
  @ApiOkResponse({ type: WelcomeResponseDto })
  getHello(): WelcomeResponseDto {
    return {
      message:
        'Bienvenido a la API de FitClase - Sistema de reservas deportivas',
    };
  }
}
