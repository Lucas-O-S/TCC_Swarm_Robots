import type { ChangeEvent } from "react";
import { useState } from "react";
import type { MapModel } from "../../model/Map.Model";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";
import { MapMenuLayout } from "../../components/MapMenuLayout/MapMenuLayout";
import { Menu } from "../../components/Menu/Menu";
import { Obstacle } from "../../components/Obstacle/Obstacle";
import { Waypoint } from "../../components/Waypoint/Waypoint";
import { RobotPath } from "../../components/RobotPath/RobotPath";
import { MapToolButton } from "../../components/MapToolButton/MapToolButton";
import { WaypointIcon, AreaIcon } from "../../components/MapToolButton/icons";
import { WaypointDrawer } from "../../components/WaypointDrawer/WaypointDrawer";
import { SelectTaskMapModal } from "../../components/SelectTaskMapModal/SelectTaskMapModal";
import { Button } from "../../components/Button/Button";
import { TaskService } from "../../services/Task.Service";
import { CenarioService } from "../../services/Cenario.Service";
import { createWaypointFromRect } from "./useTaskEditor";
import type { TaskWaypointDraft } from "./useTaskEditor";
import styles from "./TaskBuilder.module.css";

const AREA_COLOR = "var(--color-yellow)";

type Tool = "move" | "select" | "waypoint" | "area";
type SaveState = { status: "idle" | "saving" | "error" | "success"; message?: string };

// Construtor de tasks (rota de waypoints) — mesmo padrão do CenarioBuilder:
// <MapCanvas> com uma ferramenta extra (aqui "waypoint" em vez de
// "obstáculo") que desenha um elemento novo em célula vazia, e o resto
// (mover/selecionar/arrastar/apagar) de graça via useMapElement (ver
// <Waypoint>). Diferente do CenarioBuilder: a rota precisa saber o tamanho
// do grid e os obstáculos de um mapa já existente (pra desviar deles), então
// selecionar um mapa é obrigatório antes de liberar o mapa — ver
// SelectTaskMapModal. Sem conexão com o banco ainda, a única opção é o mock
// (CenarioService.createMockMap).
export function TaskBuilder() {
  const [mapConfig, setMapConfig] = useState<MapModel | null>(null);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(0);
  const [waypoints, setWaypoints] = useState<TaskWaypointDraft[]>([]);
  // Área/bloco = mesmo sistema de waypoints (mesmo tipo, mesma criação por
  // clique), só que numa lista separada e desenhada como loop fechado em
  // vez de rota aberta (ver <RobotPath closed /> mais abaixo).
  const [areaPoints, setAreaPoints] = useState<TaskWaypointDraft[]>([]);
  const [tool, setTool] = useState<Tool>("move");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const waypointTool = tool === "waypoint";
  const areaTool = tool === "area";
  const canMoveWaypoint = tool === "select" || tool === "waypoint" || tool === "area";

  function handleSelectMockMap() {
    setMapConfig(CenarioService.createMockMap());
    setWaypoints([]);
    setAreaPoints([]);
  }

  function handleChangeMap() {
    setMapConfig(null);
    setWaypoints([]);
    setAreaPoints([]);
  }

  function updateWaypoint(id: string, patch: Partial<Pick<TaskWaypointDraft, "x" | "y">>) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function removeWaypoint(id: string) {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  function updateAreaPoint(id: string, patch: Partial<Pick<TaskWaypointDraft, "x" | "y">>) {
    setAreaPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removeAreaPoint(id: string) {
    setAreaPoints((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveState({ status: "error", message: "Dê um nome pra task antes de salvar." });
      return;
    }

    setSaveState({ status: "saving" });
    const result = await TaskService.create(
      name,
      waypoints.map((w) => ({ x: w.x, y: w.y })),
    );

    setSaveState(
      result.ok
        ? { status: "success", message: `Task "${result.data.name}" salva.` }
        : { status: "error", message: result.message },
    );
  }

  const routePoints = waypoints.map((w, index) => ({ orderIndex: index, x: w.x, y: w.y }));
  const areaRoutePoints = areaPoints.map((p, index) => ({ orderIndex: index, x: p.x, y: p.y }));

  return (
    <>
      <SelectTaskMapModal open={mapConfig === null} onSelectMock={handleSelectMockMap} />

      <MapMenuLayout
        menu={
          <Menu title="Nova task">
            {!mapConfig && <p className={styles.routeSummary}>Selecione um mapa pra começar.</p>}

            {mapConfig && (
              <>
                <div className={styles.mapSummary}>
                  <span>
                    {mapConfig.cenario.name} ({mapConfig.cenario.sizeX}×{mapConfig.cenario.sizeY})
                  </span>
                  <Button variant="outline" onClick={handleChangeMap}>
                    Trocar mapa
                  </Button>
                </div>

                <label className={styles.field}>
                  Nome
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </label>

                <label className={styles.field}>
                  Prioridade
                  <input
                    type="number"
                    min={0}
                    value={priority}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value)) setPriority(value);
                    }}
                  />
                </label>

                <p className={styles.routeSummary}>
                  {waypoints.length === 0
                    ? 'Nenhum waypoint ainda — use a ferramenta "Waypoint" e clique no mapa.'
                    : `${waypoints.length} waypoint${waypoints.length > 1 ? "s" : ""} na rota.`}
                </p>

                <p className={styles.routeSummary}>
                  {areaPoints.length === 0
                    ? 'Nenhum ponto de área ainda — use a ferramenta "Área" e clique no mapa (fecha em loop com 3+ pontos).'
                    : `${areaPoints.length} ponto${areaPoints.length > 1 ? "s" : ""} de área.`}
                </p>

                <Button variant="accent" onClick={handleSave} disabled={saveState.status === "saving"}>
                  {saveState.status === "saving" ? "Salvando..." : "Salvar"}
                </Button>

                {saveState.message && (
                  <p className={saveState.status === "error" ? styles.errorMessage : styles.successMessage}>
                    {saveState.message}
                  </p>
                )}
              </>
            )}
          </Menu>
        }
      >
        {(maxMapHeight) => {
          if (!mapConfig) {
            return <div className={styles.placeholder} style={{ height: maxMapHeight }} />;
          }

          const { cenario } = mapConfig;

          return (
            <MapCanvas
              mapModel={mapConfig}
              fitWidth
              maxHeight={maxMapHeight}
              className={waypointTool || areaTool ? styles.editableGrid : undefined}
              tool={tool}
              onToolChange={setTool}
              createTool={waypointTool || areaTool ? tool : undefined}
              onCreateElement={(rect) => {
                if (waypointTool) {
                  setWaypoints((prev) => [...prev, createWaypointFromRect(rect, cenario.sizeX, cenario.sizeY)]);
                } else if (areaTool) {
                  setAreaPoints((prev) => [...prev, createWaypointFromRect(rect, cenario.sizeX, cenario.sizeY)]);
                }
              }}
              renderCreatePreview={(rect) => (
                <Waypoint
                  x={rect.x + rect.width / 2}
                  y={rect.y + rect.height / 2}
                  color={areaTool ? AREA_COLOR : undefined}
                  className={styles.waypointPreview}
                />
              )}
              tools={
                <>
                  <MapToolButton
                    active={waypointTool}
                    onClick={() => setTool(waypointTool ? "move" : "waypoint")}
                    title="Adicionar waypoint (clique no mapa)"
                  >
                    <WaypointIcon />
                  </MapToolButton>
                  <MapToolButton
                    active={areaTool}
                    onClick={() => setTool(areaTool ? "move" : "area")}
                    title="Adicionar ponto de área (clique no mapa, fecha em loop com 3+ pontos)"
                  >
                    <AreaIcon />
                  </MapToolButton>
                </>
              }
              panel={<WaypointDrawer allWaypoints={waypoints} onChange={updateWaypoint} />}
            >
              {(cellWidth, cellHeight) => (
                <>
                  {cenario.Obstacles.map((obstacle) => (
                    <Obstacle
                      key={obstacle.id}
                      label={obstacle.name}
                      title={obstacle.name}
                      x={obstacle.startPointX * cellWidth}
                      y={obstacle.startPointY * cellHeight}
                      width={obstacle.sizeX * cellWidth}
                      height={obstacle.sizeY * cellHeight}
                    />
                  ))}

                  <RobotPath points={areaRoutePoints} cellSize={cellWidth} color={AREA_COLOR} closed />

                  {areaPoints.map((point, index) => (
                    <Waypoint
                      key={point.id}
                      id={point.id}
                      order={index + 1}
                      color={AREA_COLOR}
                      x={(point.x + 0.5) * cellWidth}
                      y={(point.y + 0.5) * cellHeight}
                      movable
                      onMove={(next) =>
                        updateAreaPoint(point.id, {
                          x: Math.max(0, Math.min(cenario.sizeX - 1, Math.round(next.x / cellWidth - 0.5))),
                          y: Math.max(0, Math.min(cenario.sizeY - 1, Math.round(next.y / cellHeight - 0.5))),
                        })
                      }
                      removable
                      onRemove={() => removeAreaPoint(point.id)}
                      className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                    />
                  ))}

                  <RobotPath points={routePoints} cellSize={cellWidth} />

                  {waypoints.map((waypoint, index) => (
                    <Waypoint
                      key={waypoint.id}
                      id={waypoint.id}
                      order={index + 1}
                      x={(waypoint.x + 0.5) * cellWidth}
                      y={(waypoint.y + 0.5) * cellHeight}
                      movable
                      onMove={(next) =>
                        updateWaypoint(waypoint.id, {
                          x: Math.max(0, Math.min(cenario.sizeX - 1, Math.round(next.x / cellWidth - 0.5))),
                          y: Math.max(0, Math.min(cenario.sizeY - 1, Math.round(next.y / cellHeight - 0.5))),
                        })
                      }
                      removable
                      onRemove={() => removeWaypoint(waypoint.id)}
                      className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                    />
                  ))}
                </>
              )}
            </MapCanvas>
          );
        }}
      </MapMenuLayout>
    </>
  );
}
