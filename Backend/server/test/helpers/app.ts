import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/app.setup';
import { EdgeClient } from 'src/Classes/Edge/Edge.Client';
import { SwarmService } from 'src/Classes/Swarm/Swarm.Service';
import { clearDatabase } from './db';

/** Bateria considerada boa nos testes (o limite do orquestrador é 3,0 V). */
export const BATERIA_OK = 3.9;

/**
 * App de teste: o AppModule inteiro, com a mesma configuração do main.ts
 * (configureApp) e com a borda isolada por mocks:
 * - sendCommand do EdgeClient não fala com a borda, só registra a chamada;
 * - batteryVolts e taskBlockReason do SwarmService simulam o estado da frota
 *   que viria da borda (bateria e calibração/posição).
 */
export interface TestContext {
    app: INestApplication<App>;
    sequelize: Sequelize;
    sendCommand: jest.SpyInstance;
    batteryVolts: jest.SpyInstance;
    taskBlockReason: jest.SpyInstance;
}

export async function createTestApp(): Promise<TestContext> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    const app = moduleRef.createNestApplication<INestApplication<App>>();
    configureApp(app);
    await app.init();

    const edge = app.get(EdgeClient);
    const swarm = app.get(SwarmService);

    return {
        app,
        sequelize: app.get(Sequelize),
        sendCommand: jest.spyOn(edge, 'sendCommand'),
        batteryVolts: jest.spyOn(swarm, 'batteryVolts'),
        taskBlockReason: jest.spyOn(swarm, 'taskBlockReason'),
    };
}

/**
 * Estado limpo antes de cada caso: banco vazio, borda respondendo OK e robô
 * com bateria boa e calibrado. Cada caso muda só o que a pré-condição pede.
 */
export async function resetState(ctx: TestContext): Promise<void> {
    await clearDatabase(ctx.sequelize);
    ctx.sendCommand.mockReset().mockResolvedValue({});
    ctx.batteryVolts.mockReset().mockReturnValue(BATERIA_OK);
    ctx.taskBlockReason.mockReset().mockReturnValue(null);
}
