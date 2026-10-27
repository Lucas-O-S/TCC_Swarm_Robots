import { Column, DataType, Table } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";

/**
 * Usuário do sistema (operador), não confundir com o robô. Sistema de auth
 * básico (usuário/senha) - ver src/Auth. UUID/paranoid/timestamps igual aos
 * outros models do projeto (BaseModel), divergindo de propósito do padrão
 * `tb_`/PK inteiro do ApiGameHit (ver AGENTS.md).
 *
 * `defaultScope` exclui `passwordHash` de toda query por padrão (inclusive
 * do CRUD genérico do BaseController/BaseRepository, que não sabe nada
 * sobre "campo sensível") - só o `UserRepository.getByUsername` (usado no
 * login) pede o hash de volta explicitamente via `.unscoped()`.
 */
@Table({
    tableName: "users",
    underscored: true,
    paranoid: true,
    defaultScope: {
        attributes: { exclude: ["passwordHash"] },
    },
})
export class UserModel extends BaseModel<UserModel> {

    @Column({ type: DataType.STRING, unique: true, allowNull: false })
    username: string;

    /** Hash bcrypt - nunca guardar a senha em texto puro. */
    @Column({ type: DataType.STRING, allowNull: false })
    passwordHash: string;
}
