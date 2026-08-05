import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

/**
 * bootstrap: punto de entrada de la API.
 * Aquí configuramos cosas "globales" que afectan a todos los endpoints:
 * CORS, validación de DTOs y documentación Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Archivos subidos por admin (imágenes de producto)
  const uploadsRoot = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads/' });

  // Prefijo /api para separar claramente las rutas de la API
  // (ej: http://localhost:3001/api/products)
  app.setGlobalPrefix('api');

  // CORS: el frontend (Next.js en :3000) podrá llamar a esta API
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
    credentials: true,
  });

  /**
   * ValidationPipe global:
   * - whitelist: elimina campos que no estén en el DTO (seguridad)
   * - forbidNonWhitelisted: rechaza requests con campos desconocidos
   * - transform: convierte tipos (string → number, etc.) según el DTO
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger: documentación interactiva en /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tienda Ropa Mamá API')
    .setDescription(
      'API REST Aleluya Maternity. JWT + Openpay (tarjeta / Yape + webhook).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pega el token JWT obtenido en /api/auth/login',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  console.log(`API escuchando en http://localhost:${port}/api`);
  console.log(`Swagger en http://localhost:${port}/api/docs`);
}

bootstrap();
