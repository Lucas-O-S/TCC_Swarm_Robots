
export interface ObstaclesModel  {
    /** Id local (frontend), estável enquanto o obstáculo existe — ainda não vem de backend/DTO. */
    id : string;
    name : string;
    description : string;
    sizeY : number;
    sizeX : number;
    obstacles : boolean;
    startPointX : number;
    startPointY : number;
    cenarioId : string;


}