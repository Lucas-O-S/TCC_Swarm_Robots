import type { ObstacleModel } from "./Obstacle.Model";

/**
 * Cenário (arena + obstáculos) como a UI usa: tamanhos e posições em
 * **células** do grid (o backend guarda em mm — a conversão é do
 * `ScenarioMapper`).
 */
export interface ScenarioModel {
    /** `null` enquanto o cenário ainda não foi salvo no backend. */
    uuid: string | null;
    name : string;
    description : string;
    sizeY : number;
    sizeX : number;
    obstacles : ObstacleModel[];
}