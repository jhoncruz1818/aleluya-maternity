import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

/**
 * Endpoint de salud (health check).
 * Útil para comprobar que el servidor arrancó sin tocar aún los módulos de negocio.
 */
@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Comprobar que la API está viva' })
  getHealth() {
    return this.appService.getHealth();
  }
}
