import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configureApp } from './app.setup';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);

  // CORS liberado pra dev: permite o dashboard (Frontend/dashboard.html, aberto
  // como arquivo) chamar as rotas REST. O WebSocket já tem cors:'*' no gateway.
  app.enableCors();

  const config = new DocumentBuilder()
  .setTitle('TCC Swarm Robots')
  .setDescription('API for the TCC Swarm Robots project')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Validação e envelope padrão de resposta - ver src/app.setup.ts.
  configureApp(app);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Server is running on port ${process.env.PORT ?? 3000}`);

}
bootstrap();
