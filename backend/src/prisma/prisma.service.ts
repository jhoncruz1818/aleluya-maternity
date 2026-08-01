import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService: un único cliente de base de datos para toda la app.
 *
 * ¿Por qué un Service y no new PrismaClient() en cada módulo?
 * - Nest gestiona el ciclo de vida (conectar al arrancar, desconectar al apagar).
 * - Evitamos abrir muchas conexiones a SQL Server (agotaría el pool).
 * - Cualquier módulo puede inyectarlo con dependency injection.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Conectamos al levantar Nest para fallar pronto si SQL Server no está disponible
    await this.$connect();
  }

  async onModuleDestroy() {
    // Cerramos conexiones limpiamente al apagar el servidor
    await this.$disconnect();
  }
}
