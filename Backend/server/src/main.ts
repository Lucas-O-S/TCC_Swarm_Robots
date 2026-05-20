import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule } from './app.module';
import { DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
  .setTitle('TCC Swarm Robots')
  .setDescription('API for the TCC Swarm Robots project')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  await app.listen(process.env.PORT ?? 3000);

}
bootstrap();
