import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // Security headers
  app.use(helmet());

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // properties not in DTO are stripped
      transform: true, // auto-transform payloads to DTO instances
    }),
  );

  // Enable CORS for mobile app
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Increase body size limit for large audio files (200MB)
  app.use(require('express').json({ limit: '200mb' }));
  app.use(require('express').urlencoded({ limit: '200mb', extended: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
