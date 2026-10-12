/** Obstáculo de um cenário. Tamanho e posição em **células** do grid. */

export interface ObstacleModel  {
    /** Id estável na tela: o `uuid` do backend, ou um id local (`crypto.randomUUID()`) se ainda não foi salvo. */
    id : string;
    name : string;
    description : string;
    sizeY : number;
    sizeX : number;
    startPointX : number;
    startPointY : number;
    obstacles : boolean;
    /** `""` enquanto o cenário ainda não foi salvo. */
    scenarioId : string;
}