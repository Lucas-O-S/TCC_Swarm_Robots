import { Model } from "sequelize";
import { Column } from "sequelize-typescript";
import { BaseModel } from "./Base.Model";


export class RobotModel extends BaseModel<RobotModel>{
    

    @Column
    BateryLevel: number;
    

}