import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { edgeConfig } from './config/edge.config';

async function bootstrap() {

    const app = await NestFactory.create(AppModule);

    app.enableCors();

    // Contrato público versionado: tudo em /v1. Mudança que quebra cliente vira /v2.
    app.setGlobalPrefix('v1');

    const config = new DocumentBuilder()
        .setTitle('TCC Swarm Robots - Borda')
        .setDescription(
            'Borda dos robôs: fala Mari/HDLC com o gateway e expõe a frota por REST (/v1) ' +
            'e socket.io (eventos robot:state, robot:status, robot:joined).'
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));

    await app.listen(edgeConfig.port, '0.0.0.0');
    console.log(`[EDGE] borda rodando na porta ${edgeConfig.port} (GATEWAY_MODE=${process.env.GATEWAY_MODE ?? 'simulator'})`);
}
bootstrap();
