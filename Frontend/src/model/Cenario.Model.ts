import type { ObstaclesModel } from "./Obstacles.Model";

export interface CenarioModel {

    name : string;
    description : string;
    sizeY : number;
    sizeX : number;
    Obstacles : ObstaclesModel[];

}