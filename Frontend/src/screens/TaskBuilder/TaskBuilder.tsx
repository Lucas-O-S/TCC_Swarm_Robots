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
import { WaypointIcon, AreaIcon, RobotIcon, PlayIcon, PauseIcon, StopIcon } from "../../components/MapToolButton/icons";
import { Robot } from "../../components/Robot/RobotProp";
import { RobotStatus } from "../../enums/RobotStatus.enum";
import { WaypointDrawer } from "../../components/WaypointDrawer/WaypointDrawer";
import { AreaDrawer } from "../../components/AreaDrawer/AreaDrawer";
import { SelectTaskMapModal } from "../../components/SelectTaskMapModal/SelectTaskMapModal";
import { Button } from "../../components/Button/Button";
import { TaskService } from "../../services/Task.Service";
import { CenarioService } from "../../services/Cenario.Service";
import {
  areaCorners,
  areaTraversal,
  createAreaFromRect,
  createWaypointFromRect,
  flattenRoute,
  moveAreaCorner,
} from "./useTaskEditor";
import type { AreaCorner, AreaTraversalSettings, TaskStopDraft, TaskWaypointDraft } from "./useTaskEditor";
import { useTaskRobot } from "./useTaskRobot";
import { TaskRobot } from "./TaskRobot";
import styles from "./TaskBuilder.module.css";

const AREA_COLOR = "var(--color-yellow)";

/** Velocidade da prévia do percurso, em células por segundo. */
const PLAYBACK_SPEED = 5;

type Tool = "move" | "select" | "waypoint" | "area" | "robot";
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
  // Rota = uma lista só de paradas, waypoint unitário OU bloco (sempre um
  // retângulo de 4 waypoints, um por canto, criado arrastando no mapa — ver
  // useTaskEditor/TaskAreaDraft). A ordem de criação é a ordem da rota, e a
  // linha liga todas as paradas em sequência (ver flattenRoute).
  const [stops, setStops] = useState<TaskStopDraft[]>([]);
  const [tool, setTool] = useState<Tool>("move");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const waypointTool = tool === "waypoint";
  const areaTool = tool === "area";
  const robotTool = tool === "robot";
  const createTool = waypointTool || areaTool || robotTool;
  const canMoveWaypoint = tool === "select" || createTool;

  function handleSelectMockMap() {
    setMapConfig(CenarioService.createMockMap());
    setStops([]);
    placeRobot(null);
  }

  function handleChangeMap() {
    setMapConfig(null);
    setStops([]);
    placeRobot(null);
  }

  function updateWaypoint(id: string, patch: Partial<Pick<TaskWaypointDraft, "x" | "y">>) {
    setStops((prev) => prev.map((s) => (s.kind === "waypoint" && s.id === id ? { ...s, ...patch } : s)));
  }

  function updateAreaCorner(areaId: string, corner: AreaCorner, x: number, y: number) {
    setStops((prev) => prev.map((s) => (s.kind === "area" && s.id === areaId ? moveAreaCorner(s, corner, x, y) : s)));
  }

  function updateAreaTraversal(areaId: string, patch: Partial<AreaTraversalSettings>) {
    setStops((prev) => prev.map((s) => (s.kind === "area" && s.id === areaId ? { ...s, ...patch } : s)));
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  const waypoints = stops.filter((s) => s.kind === "waypoint");
  const areas = stops.filter((s) => s.kind === "area");

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

  // `orderById` numera todo ponto da rota (waypoint, canto de bloco e ponto
  // de zigzag) na ordem de percurso — é o número exibido em cada marcador e
  // nos drawers.
  const { order: orderById, points } = flattenRoute(stops);
  const routePoints = points.map((p, index) => ({ orderIndex: index, x: p.x, y: p.y }));
  // Robô da prévia — no máximo 1 nesta tela (posicionar de novo só move o
  // mesmo). Sem dependência nenhuma da rota: tem posição própria, não entra
  // na linha, na numeração nem nos blocos, e mexer nos pontos não o move. O
  // ▶ só manda ele ir até os pontos, na ordem (ver useTaskRobot).
  const { robot, playing, place: placeRobot, play, pause, stop } = useTaskRobot(points, PLAYBACK_SPEED);
  const canPlay = robot !== null && points.length > 0;

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
                  {areas.length === 0
                    ? 'Nenhum bloco ainda — use a ferramenta "Área" e arraste no mapa pra desenhar um retângulo.'
                    : `${areas.length} bloco${areas.length > 1 ? "s" : ""} na rota.`}
                </p>

                <div className={styles.mapSummary}>
                  <span>
                    {robot === null
                      ? 'Nenhum robô — use a ferramenta "Robô" e clique no mapa (1 por task).'
                      : `Robô em (${Math.round(robot.position.x)}, ${Math.round(robot.position.y)}) — ▶ no mapa pra vê-lo ir até os pontos da rota.`}
                  </span>
                  {robot && (
                    <Button variant="outline" onClick={() => placeRobot(null)}>
                      Remover
                    </Button>
                  )}
                </div>

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
              className={createTool ? styles.editableGrid : undefined}
              tool={tool}
              onToolChange={setTool}
              createTool={createTool ? tool : undefined}
              onCreateElement={(rect) => {
                if (waypointTool) {
                  setStops((prev) => [...prev, createWaypointFromRect(rect, cenario.sizeX, cenario.sizeY)]);
                } else if (areaTool) {
                  const next = createAreaFromRect(rect, cenario.sizeX, cenario.sizeY, points.at(-1));
                  if (next) setStops((prev) => [...prev, next]);
                } else if (robotTool) {
                  // Célula sob o clique (floor, não round) travada no grid.
                  // Só 1 robô: posicionar de novo move o mesmo, e a
                  // ferramenta desliga sozinha depois de posicionar.
                  placeRobot({
                    x: Math.max(0, Math.min(cenario.sizeX - 1, Math.floor(rect.startPointX))),
                    y: Math.max(0, Math.min(cenario.sizeY - 1, Math.floor(rect.startPointY))),
                  });
                  setTool("move");
                }
              }}
              renderCreatePreview={(rect) => {
                if (areaTool) {
                  return (
                    <div
                      className={`${styles.areaOutline} ${styles.waypointPreview}`}
                      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderColor: AREA_COLOR }}
                    />
                  );
                }
                if (robotTool) {
                  return (
                    <Robot
                      label="R"
                      status={RobotStatus.Active}
                      className={styles.waypointPreview}
                      style={{ position: "absolute", left: rect.x + rect.width / 2, top: rect.y + rect.height / 2 }}
                    />
                  );
                }
                return (
                  <Waypoint x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} className={styles.waypointPreview} />
                );
              }}
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
                    title="Desenhar bloco (arraste no mapa pra formar um retângulo)"
                  >
                    <AreaIcon />
                  </MapToolButton>
                  <MapToolButton
                    active={robotTool}
                    onClick={() => setTool(robotTool ? "move" : "robot")}
                    title={robot ? "Reposicionar o robô (clique no mapa)" : "Posicionar robô (clique no mapa — 1 por task)"}
                  >
                    <RobotIcon />
                  </MapToolButton>
                  <MapToolButton
                    variant="click"
                    onClick={playing ? pause : play}
                    disabled={!canPlay}
                    title={
                      !canPlay
                        ? "Posicione um robô e crie a rota pra ver o percurso"
                        : playing
                          ? "Pausar o robô"
                          : "Mandar o robô ir até os pontos da rota"
                    }
                  >
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </MapToolButton>
                  <MapToolButton
                    variant="click"
                    onClick={stop}
                    disabled={!robot?.mission}
                    title="Parar e voltar o robô pra onde ele estava antes do ▶"
                  >
                    <StopIcon />
                  </MapToolButton>
                </>
              }
              panel={
                <>
                  <WaypointDrawer allWaypoints={waypoints} onChange={updateWaypoint} orderById={orderById} />
                  <AreaDrawer allAreas={areas} orderById={orderById} onChange={updateAreaTraversal} />
                </>
              }
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

                  {/*
                    Área de cada bloco ligando os centros dos 4 cantos — é
                    região (preenchimento + borda fina sólida), não linha: a
                    rota (abaixo) passa por cima pelos mesmos lados, e duas
                    linhas tracejadas sobrepostas ficavam ilegíveis.
                  */}
                  {areas.map((area) => (
                    <div
                      key={area.id}
                      className={styles.areaOutline}
                      style={{
                        left: (Math.min(area.x1, area.x2) + 0.5) * cellWidth,
                        top: (Math.min(area.y1, area.y2) + 0.5) * cellHeight,
                        width: Math.abs(area.x2 - area.x1) * cellWidth,
                        height: Math.abs(area.y2 - area.y1) * cellHeight,
                        borderColor: AREA_COLOR,
                      }}
                    />
                  ))}

                  <RobotPath points={routePoints} cellSize={cellWidth} cellHeight={cellHeight} variant="arrows" />

                  {/*
                    Pontos de dentro do zigzag — derivados do bloco (padrão +
                    passadas), então só exibem o número: sem id, não entram em
                    seleção/arrasto. Quem redimensiona o bloco são os cantos.
                  */}
                  {areas.flatMap((area) =>
                    areaTraversal(area)
                      .filter((point) => !point.corner)
                      .map((point) => (
                        <Waypoint
                          key={point.id}
                          order={orderById.get(point.id)}
                          color={AREA_COLOR}
                          x={(point.x + 0.5) * cellWidth}
                          y={(point.y + 0.5) * cellHeight}
                          className={styles.innerAreaPoint}
                        />
                      )),
                  )}

                  {areas.flatMap((area) =>
                    areaCorners(area).map((point) => (
                      <Waypoint
                        key={point.id}
                        id={point.id}
                        order={orderById.get(point.id)}
                        color={AREA_COLOR}
                        x={(point.x + 0.5) * cellWidth}
                        y={(point.y + 0.5) * cellHeight}
                        movable
                        onMove={(next) =>
                          updateAreaCorner(
                            area.id,
                            point.corner,
                            Math.max(0, Math.min(cenario.sizeX - 1, Math.round(next.x / cellWidth - 0.5))),
                            Math.max(0, Math.min(cenario.sizeY - 1, Math.round(next.y / cellHeight - 0.5))),
                          )
                        }
                        removable
                        onRemove={() => removeStop(area.id)}
                        className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                      />
                    )),
                  )}

                  {waypoints.map((waypoint) => (
                    <Waypoint
                      key={waypoint.id}
                      id={waypoint.id}
                      order={orderById.get(waypoint.id)}
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
                      onRemove={() => removeStop(waypoint.id)}
                      className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                    />
                  ))}

                  {/*
                    O robô, sempre um só: a posição é dele (anda no ▶, ou é
                    arrastado/reposicionado à mão) e fica onde está quando a
                    rota muda. A seta é o rumo da última vez que ele andou —
                    sem seta enquanto nunca andou.
                  */}
                  {robot && (
                    <TaskRobot
                      x={(robot.position.x + 0.5) * cellWidth}
                      y={(robot.position.y + 0.5) * cellHeight}
                      direction={robot.heading ?? undefined}
                      onMove={(next) =>
                        placeRobot({
                          x: Math.max(0, Math.min(cenario.sizeX - 1, Math.round(next.x / cellWidth - 0.5))),
                          y: Math.max(0, Math.min(cenario.sizeY - 1, Math.round(next.y / cellHeight - 0.5))),
                        })
                      }
                      onRemove={() => placeRobot(null)}
                      className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                    />
                  )}
                </>
              )}
            </MapCanvas>
          );
        }}
      </MapMenuLayout>
    </>
  );
}
