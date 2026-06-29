import { Model } from "sequelize";
import { Column, PrimaryKey } from "sequelize-typescript";



export abstract class BaseModel<T extends Model = any> extends Model<T> {

    @Column
    @PrimaryKey
    UUID: string;

    @Column
    Name: string;

    @Column
    CreatedAt: Date;

    @Column
    UpdatedAt: Date;

    @Column
    DeletedAt: Date;


}