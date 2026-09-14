import type { MapModel } from "../model/Map.Model";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../Consts/MapConsts";

export const CenarioService = {
  createBlankMap(): MapModel {
    return {
      cenario: {
        sizeX: DEFAULT_COLS,
        sizeY: DEFAULT_ROWS,
        name: "",
        description: "",
        Obstacles: [],
      },
      robots: [],
    };
  },
};
