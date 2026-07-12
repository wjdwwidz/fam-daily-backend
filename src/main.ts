import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors(); // 앱(Expo)에서 호출 허용
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드 제거
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (API 문서) — http://localhost:3000/api/docs
  const config = new DocumentBuilder()
    .setTitle('우리끼리 가족앱 API')
    .setVersion('1.0')
    .addBearerAuth() // JWT 토큰 인증
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API:  http://localhost:${port}/api`);
  console.log(`Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
