import { Column, PrimaryKey, Default, DataType, CreatedAt, UpdatedAt, DeletedAt, Model } from "sequelize-typescript";

/**
 * Colunas de auditoria realmente universais (pk + timestamps).
 *
 * "Name" foi removido daqui de propósito: nem toda tabela tem nome
 * (ex.: `position` não tem), então cada model concreto declara os
 * campos que fazem sentido pra ele.
 *
 * Os models concretos devem usar `@Table({ underscored: true, paranoid: true })`
 * para que os nomes de coluna batam com o snake_case usado no init.sql
 * (createdAt -> created_at, etc). Sem isso, o Sequelize monta queries com
 * o nome exato do atributo (camelCase) e o Postgres não encontra a coluna.
 */
export abstract class BaseModel<T extends Model = any> extends Model<T> {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    uuid: string;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    @DeletedAt
    declare deletedAt: Date;
}
