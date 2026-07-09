import { Body, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { Model } from "sequelize";
import { BaseService } from "src/Classes/Base/Base.Service";

/**
 * Rotas REST genéricas (list/get/create/update/delete) em cima de um
 * BaseService. O Controller concreto aplica @Controller('prefixo').
 *
 * Atenção: `Partial<T>` aqui é só pra tipagem em compile-time - genéricos são
 * apagados em runtime, então o `design:paramtypes` do `create`/`update`
 * herdados vira `Object`, e o ValidationPipe global (whitelist +
 * forbidNonWhitelisted) PULA a validação quando o metatype é `Object`. Se o
 * Controller concreto precisa validar o body com um DTO real (é o caso do
 * Robot), sobrescreva `create`/`update` redeclarando o método com o DTO
 * concreto no `@Body()` e chamando `super.create(dto)` / `super.update(...)`
 * - os métodos são "virtuais" como qualquer método de classe em TS.
 */
export abstract class BaseController<T extends Model> {

    protected constructor(protected readonly service: BaseService<T>) {}

    @Get()
    async getAll(): Promise<T[]> {
        return await this.service.getAll();
    }

    @Get(":uuid")
    async getOne(@Param("uuid") uuid: string): Promise<T> {
        return await this.service.getOne(uuid);
    }

    @Post()
    async create(@Body() dto: Partial<T>): Promise<T> {
        return await this.service.create(dto);
    }

    @Put(":uuid")
    async update(@Param("uuid") uuid: string, @Body() dto: Partial<T>): Promise<T> {
        return await this.service.update(uuid, dto);
    }

    @Delete(":uuid")
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param("uuid") uuid: string): Promise<void> {
        await this.service.remove(uuid);
    }
}
