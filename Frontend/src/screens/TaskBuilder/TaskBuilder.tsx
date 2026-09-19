import type { ChangeEvent } from "react";
import { useState } from "react";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";
import { MapMenuLayout } from "../../components/MapMenuLayout/MapMenuLayout";
import { Menu } from "../../components/Menu/Menu";
import { Waypoint } from "../../components/Waypoint/Waypoint";
import { RobotPath } from "../../components/RobotPath/RobotPath";
import { MapToolButton } from "../../components/MapToolButton/MapToolButton";
import { WaypointIcon } from "../../components/MapToolButton/icons";
import { WaypointDrawer } from "../../components/WaypointDrawer/WaypointDrawer";
import { Button } from "../../components/Button/Button";
import { TaskService } from "../../services/Task.Service";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../../Consts/MapConsts";
import { createWaypointFromRect } from "./useTaskEditor";
import type { TaskWaypointDraft } from "./useTaskEditor";
import styles from "./TaskBuilder.module.css";

type Tool = "move" | "select" | "waypoint";
type SaveState = { status: "idle" | "saving" | "error" | "success"; message?: string };

// Construtor de tasks (rota de waypoints) — mesmo padrão do CenarioBuilder:
// <MapCanvas> com uma ferramenta extra (aqui "waypoint" em vez de
// "obstáculo") que desenha um elemento novo em célula vazia, e o resto
// (mover/selecionar/arrastar/apagar) de graça via useMapElement (ver
// <Waypoint>). Task não tem cenarioId no model (ver Task.Model.ts) — o
// tamanho do grid aqui é só pra ter onde desenhar a rota, não é salvo.
export function TaskBuilder() {
  const [sizeX, setSizeX] = useState(DEFAULT_COLS);
  const [sizeY, setSizeY] = useState(DEFAULT_ROWS);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(0);
  const [waypoints, setWaypoints] = useState<TaskWaypointDraft[]>([]);
  const [tool, setTool] = useState<Tool>("move");
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const waypointTool = tool === "waypoint";
  const canMoveWaypoint = tool === "select" || tool === "waypoint";

  function handleNumberChange(setter: (value: number) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      if (!Number.isNaN(value)) setter(value);
    };
  }

  function updateWaypoint(id: string, patch: Partial<Pick<TaskWaypointDraft, "x" | "y">>) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function removeWaypoint(id: string) {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }

  function clampToGrid(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(sizeX - 1, x)),
      y: Math.max(0, Math.min(sizeY - 1, y)),
    };
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveState({ status: "error", message: 'Dê um nome pra task antes de salvar.' });
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

  return (
    <MapMenuLayout
      menu={
        <Menu title="Nova task">
          <label className={styles.field}>
            Nome
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className={styles.field}>
            Prioridade
            <input type="number" min={0} value={priority} onChange={handleNumberChange(setPriority)} />
          </label>

          <div className={styles.fieldRow}>
            <label className={styles.field}>
              Largura (colunas)
              <input type="number" min={1} value={sizeX} onChange={handleNumberChange(setSizeX)} />
            </label>

            <label className={styles.field}>
              Altura (linhas)
              <input type="number" min={1} value={sizeY} onChange={handleNumberChange(setSizeY)} />
            </label>
          </div>

          <p className={styles.routeSummary}>
            {waypoints.length === 0
              ? 'Nenhum waypoint ainda — use a ferramenta "Waypoint" e clique no mapa.'
              : `${waypoints.length} waypoint${waypoints.length > 1 ? "s" : ""} na rota.`}
          </p>

          <Button variant="accent" onClick={handleSave} disabled={saveState.status === "saving"}>
            {saveState.status === "saving" ? "Salvando..." : "Salvar"}
          </Button>

          {saveState.message && (
            <p className={saveState.status === "error" ? styles.errorMessage : styles.successMessage}>
              {saveState.message}
            </p>
          )}
        </Menu>
      }
    >
      {(maxMapHeight) => (
        <MapCanvas
          cols={sizeX}
          rows={sizeY}
          fitWidth
          maxHeight={maxMapHeight}
          className={waypointTool ? styles.editableGrid : undefined}
          tool={tool}
          onToolChange={setTool}
          createTool="waypoint"
          onCreateElement={(rect) => setWaypoints((prev) => [...prev, createWaypointFromRect(rect, sizeX, sizeY)])}
          renderCreatePreview={(rect) => (
            <Waypoint x={rect.x + rect.width / 2} y={rect.y + rect.height / 2} className={styles.waypointPreview} />
          )}
          tools={
            <MapToolButton
              active={waypointTool}
              onClick={() => setTool(waypointTool ? "move" : "waypoint")}
              title="Adicionar waypoint (clique no mapa)"
            >
              <WaypointIcon />
            </MapToolButton>
          }
          panel={<WaypointDrawer allWaypoints={waypoints} onChange={updateWaypoint} />}
        >
          {(cellWidth, cellHeight) => (
            <>
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
                    updateWaypoint(
                      waypoint.id,
                      clampToGrid(Math.round(next.x / cellWidth - 0.5), Math.round(next.y / cellHeight - 0.5)),
                    )
                  }
                  removable
                  onRemove={() => removeWaypoint(waypoint.id)}
                  className={canMoveWaypoint ? styles.placedWaypoint : undefined}
                />
              ))}
            </>
          )}
        </MapCanvas>
      )}
    </MapMenuLayout>
  );
}
