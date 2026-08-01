import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global(): cualquier módulo de la app puede inyectar PrismaService
 * sin tener que importar PrismaModule una y otra vez.
 *
 * Exportamos PrismaService para que esté disponible fuera de este módulo.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
