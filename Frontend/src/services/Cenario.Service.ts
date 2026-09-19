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

  /**
   * Mapa fixo (sem persistência) só pra destravar o fluxo de quem depende
   * de "selecionar um mapa existente" enquanto não existe conexão real com
   * o banco (ver SelectTaskMapModal/TaskBuilder) — mesmo espírito do botão
   * "Mapas salvos" desabilitado do SelectMapModal, mas com uma opção que
   * de fato funciona pra testar.
   */
  createMockMap(): MapModel {
    return {
      cenario: {
        sizeX: 12,
        sizeY: 10,
        name: "Mapa de teste (mock)",
        description: "Mapa fixo sem persistência — só pra testar a tela enquanto não há conexão com o banco.",
        Obstacles: [
          {
            id: crypto.randomUUID(),
            name: "Obstáculo 1",
            description: "",
            sizeX: 2,
            sizeY: 2,
            obstacles: true,
            startPointX: 3,
            startPointY: 2,
            cenarioId: "",
          },
          {
            id: crypto.randomUUID(),
            name: "Obstáculo 2",
            description: "",
            sizeX: 3,
            sizeY: 1,
            obstacles: true,
            startPointX: 6,
            startPointY: 6,
            cenarioId: "",
          },
        ],
      },
      robots: [],
    };
  },
};
