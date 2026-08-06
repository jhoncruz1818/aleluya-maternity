import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * bootstrap: punto de entrada de la API.
 * Aquí configuramos cosas "globales" que afectan a todos los endpoints:
 * CORS, validación de DTOs y documentación Swagger.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';
  const frontendUrl = config.get<string>('FRONTEND_URL');

  if (isProd && !frontendUrl) {
    throw new Error('FRONTEND_URL es obligatorio en producción (CORS)');
  }

  if (isProd) {
    const whUser = config.get<string>('OPENPAY_WEBHOOK_USER')?.trim();
    const whPass = config.get<string>('OPENPAY_WEBHOOK_PASSWORD')?.trim();
    const setup = config.get<string>('WEBHOOK_SETUP_SECRET')?.trim();
    if (!whUser || !whPass) {
      throw new Error(
        'OPENPAY_WEBHOOK_USER y OPENPAY_WEBHOOK_PASSWORD son obligatorios en producción',
      );
    }
    if (!setup || setup.length < 16) {
      throw new Error(
        'WEBHOOK_SETUP_SECRET (>=16 chars) es obligatorio en producción',
      );
    }
  }

  const jwtSecret = config.getOrThrow<string>('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  if (/cambia-este-secreto|dev-secret/i.test(jwtSecret) && isProd) {
    throw new Error('JWT_SECRET de desarrollo no permitido en producción');
  }

  app.use(
    helmet({
      // API JSON; CSP la maneja el frontend / CDN
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: frontendUrl ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger solo fuera de producción (reduce superficie de ataque)
  if (!isProd) {
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
  }

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);

  console.log(`API escuchando en http://localhost:${port}/api`);
  if (!isProd) {
    console.log(`Swagger en http://localhost:${port}/api/docs`);
  }
}

bootstrap();
