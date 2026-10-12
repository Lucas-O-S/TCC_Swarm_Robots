import type { ChangeEvent } from "react";
import { useState } from "react";
import type { ScenarioModel } from "../../model/Scenario.Model";
import type { ObstacleModel } from "../../model/Obstacle.Model";
import type { MapModel } from "../../model/Map.Model";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";
import { MapMenuLayout } from "../../components/MapMenuLayout/MapMenuLayout";
import { Menu } from "../../components/Menu/Menu";
import { Obstacle } from "../../components/Obstacle/Obstacle";
import { MapToolButton } from "../../components/MapToolButton/MapToolButton";
import { ObstacleIcon } from "../../components/MapToolButton/icons";
import { SelectMapModal } from "../../components/SelectMapModal/SelectMapModal";
import { ObstacleDrawer } from "../../components/ObstacleDrawer/ObstacleDrawer";
import { Button } from "../../components/Button/Button";
import { ScenarioService } from "../../services/Scenario.Service";
import { createObstacleFromRect } from "./useObstacleEditor";
import styles from "./ScenarioBuilder.module.css";

type Tool = "move" | "select" | "obstacle";
type SaveState = { status: "idle" | "saving" | "error" | "success"; message?: string };

export function ScenarioBuilder() {

    const [isSelectMapOpen, setIsSelectMapOpen] = useState(true);
    const [mapConfig, setMapConfig] = useState<MapModel>(ScenarioService.createBlankMap);
    const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

    function updateScenario<K extends keyof ScenarioModel>(field: K, value: ScenarioModel[K]) {
        setMapConfig((prev) => ({ ...prev, scenario: { ...prev.scenario, [field]: value } }));
    }

    function handleNumberChange(field: "sizeX" | "sizeY") {
        return (e: ChangeEvent<HTMLInputElement>) => {
            const value = Number(e.target.value);
            if (!Number.isNaN(value)) updateScenario(field, value);
        };
    }

    function handleObstaclesChange(obstacles: ObstacleModel[]) {
        updateScenario("obstacles", obstacles);
    }

    function updateObstacle(id: string, patch: Partial<ObstacleModel>) {
        handleObstaclesChange(mapConfig.scenario.obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    }

    function removeObstacle(id: string) {
        handleObstaclesChange(mapConfig.scenario.obstacles.filter((o) => o.id !== id));
    }

    const [tool, setTool] = useState<Tool>("move");
    const obstacleTool = tool === "obstacle";
    const canMoveObstacle = tool === "select" || tool === "obstacle";

    function handleCreateBlank() {
        setMapConfig(ScenarioService.createBlankMap());
        setSaveState({ status: "idle" });
        setIsSelectMapOpen(false);
    }

    function handleSelectSaved(scenario: ScenarioModel) {
        setMapConfig(ScenarioService.toMap(scenario));
        setSaveState({ status: "idle" });
        setIsSelectMapOpen(false);
    }

    async function handleSave() {
        setSaveState({ status: "saving" });
        const result = await ScenarioService.save(mapConfig.scenario);

        if (!result.ok) {
            setSaveState({ status: "error", message: result.message });
            return;
        }
        // Troca pelo que o backend devolveu: agora o cenário tem `uuid` (o
        // próximo "Salvar" atualiza em vez de criar) e os obstáculos têm os ids reais.
        setMapConfig((prev) => ({ ...prev, scenario: result.data }));
        setSaveState({ status: "success", message: `Cenário "${result.data.name}" salvo.` });
    }

    async function handleDelete() {
        const { uuid, name } = mapConfig.scenario;
        if (!uuid || !window.confirm(`Excluir o cenário "${name}"?`)) return;

        setSaveState({ status: "saving" });
        const result = await ScenarioService.remove(uuid);

        if (!result.ok) {
            setSaveState({ status: "error", message: result.message });
            return;
        }
        setMapConfig(ScenarioService.createBlankMap());
        setSaveState({ status: "success", message: `Cenário "${name}" excluído.` });
    }

    return (
        <>
        <SelectMapModal
            open={isSelectMapOpen}
            onClose={() => setIsSelectMapOpen(false)}
            onCreateBlank={handleCreateBlank}
            onSelect={handleSelectSaved}
        />
        <MapMenuLayout
            menu={
                <Menu title="Configuração do mapa">
                    <label className={styles.field}>
                        Nome
                        <input
                            type="text"
                            value={mapConfig.scenario.name}
                            onChange={(e) => updateScenario("name", e.target.value)}
                        />
                    </label>

                    <label className={styles.field}>
                        Descrição
                        <textarea
                            value={mapConfig.scenario.description}
                            onChange={(e) => updateScenario("description", e.target.value)}
                        />
                    </label>

                    <div className={styles.fieldRow}>
                        <label className={styles.field}>
                            Largura (colunas)
                            <input
                                type="number"
                                min={1}
                                value={mapConfig.scenario.sizeX}
                                onChange={handleNumberChange("sizeX")}
                            />
                        </label>

                        <label className={styles.field}>
                            Altura (linhas)
                            <input
                                type="number"
                                min={1}
                                value={mapConfig.scenario.sizeY}
                                onChange={handleNumberChange("sizeY")}
                            />
                        </label>
                    </div>

                    <Button variant="accent" onClick={handleSave} disabled={saveState.status === "saving"}>
                        {saveState.status === "saving" ? "Salvando..." : "Salvar"}
                    </Button>

                    {mapConfig.scenario.uuid && (
                        <Button variant="outline" onClick={handleDelete} disabled={saveState.status === "saving"}>
                            Excluir cenário
                        </Button>
                    )}

                    <Button variant="outline" onClick={() => setIsSelectMapOpen(true)}>
                        Abrir outro mapa
                    </Button>

                    {saveState.message && (
                        <p role={saveState.status === "error" ? "alert" : "status"} className={saveState.status === "error" ? styles.errorMessage : styles.successMessage}>
                            {saveState.message}
                        </p>
                    )}
                </Menu>
            }
        >
            {(maxMapHeight) => (
                <MapCanvas
                    mapModel={mapConfig}
                    fitWidth
                    maxHeight={maxMapHeight}
                    className={obstacleTool ? styles.editableGrid : undefined}
                    tool={tool}
                    onToolChange={setTool}
                    createTool="obstacle"
                    onCreateElement={(rect) =>
                        handleObstaclesChange([...mapConfig.scenario.obstacles, createObstacleFromRect(rect, mapConfig.scenario.obstacles)])
                    }
                    renderCreatePreview={(rect) => (
                        <Obstacle
                            x={rect.x}
                            y={rect.y}
                            width={rect.width}
                            height={rect.height}
                            className={styles.obstaclePreview}
                        />
                    )}
                    tools={
                        <MapToolButton
                            active={obstacleTool}
                            onClick={() => setTool(obstacleTool ? "move" : "obstacle")}
                            title="Desenhar obstáculo (arraste no mapa)"
                        >
                            <ObstacleIcon />
                        </MapToolButton>
                    }
                    panel={<ObstacleDrawer allObstacles={mapConfig.scenario.obstacles} onChange={updateObstacle} />}
                >
                    {(cellWidth, cellHeight) => (
                        <>
                            {mapConfig.scenario.obstacles.map((obstacle) => (
                                <Obstacle
                                    key={obstacle.id}
                                    id={obstacle.id}
                                    label={obstacle.name}
                                    title={obstacleTool ? `${obstacle.name} (Backspace remove)` : obstacle.name}
                                    x={obstacle.startPointX * cellWidth}
                                    y={obstacle.startPointY * cellHeight}
                                    width={obstacle.sizeX * cellWidth}
                                    height={obstacle.sizeY * cellHeight}
                                    movable
                                    onMove={(next) =>
                                        updateObstacle(obstacle.id, {
                                            startPointX: Math.round(next.x / cellWidth),
                                            startPointY: Math.round(next.y / cellHeight),
                                        })
                                    }
                                    removable
                                    onRemove={() => removeObstacle(obstacle.id)}
                                    className={canMoveObstacle ? styles.placedObstacle : undefined}
                                />
                            ))}
                        </>
                    )}
                </MapCanvas>
            )}
        </MapMenuLayout>
        </>
    )

}