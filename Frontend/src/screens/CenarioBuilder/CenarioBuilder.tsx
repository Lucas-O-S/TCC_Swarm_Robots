import type { ChangeEvent } from "react";
import { useState } from "react";
import type { CenarioModel } from "../../model/Cenario.Model";
import type { ObstaclesModel } from "../../model/Obstacles.Model";
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
import { CenarioService } from "../../services/Cenario.Service";
import { createObstacleFromRect } from "./useObstacleEditor";
import styles from "./CenarioBuilder.module.css";

type Tool = "move" | "select" | "obstacle";

export function CenarioBuilder() {

    const [isSelectMapOpen, setIsSelectMapOpen] = useState(true);
    const [mapConfig, setMapConfig] = useState<MapModel>(CenarioService.createBlankMap);

    function updateCenario<K extends keyof CenarioModel>(field: K, value: CenarioModel[K]) {
        setMapConfig((prev) => ({ ...prev, cenario: { ...prev.cenario, [field]: value } }));
    }

    function handleNumberChange(field: "sizeX" | "sizeY") {
        return (e: ChangeEvent<HTMLInputElement>) => {
            const value = Number(e.target.value);
            if (!Number.isNaN(value)) updateCenario(field, value);
        };
    }

    function handleObstaclesChange(obstacles: ObstaclesModel[]) {
        updateCenario("Obstacles", obstacles);
    }

    function updateObstacle(id: string, patch: Partial<ObstaclesModel>) {
        handleObstaclesChange(mapConfig.cenario.Obstacles.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    }

    function removeObstacle(id: string) {
        handleObstaclesChange(mapConfig.cenario.Obstacles.filter((o) => o.id !== id));
    }

    const [tool, setTool] = useState<Tool>("move");
    const obstacleTool = tool === "obstacle";
    const canMoveObstacle = tool === "select" || tool === "obstacle";

    function handleCreateBlank() {
        setMapConfig(CenarioService.createBlankMap());
        setIsSelectMapOpen(false);
    }

    function handleSave() {
        // TODO: persistir mapConfig quando o backend de cenários existir.
    }

    return (
        <>
        <SelectMapModal
            open={isSelectMapOpen}
            onClose={() => setIsSelectMapOpen(false)}
            onCreateBlank={handleCreateBlank}
        />
        <MapMenuLayout
            menu={
                <Menu title="Configuração do mapa">
                    <label className={styles.field}>
                        Nome
                        <input
                            type="text"
                            value={mapConfig.cenario.name}
                            onChange={(e) => updateCenario("name", e.target.value)}
                        />
                    </label>

                    <label className={styles.field}>
                        Descrição
                        <textarea
                            value={mapConfig.cenario.description}
                            onChange={(e) => updateCenario("description", e.target.value)}
                        />
                    </label>

                    <div className={styles.fieldRow}>
                        <label className={styles.field}>
                            Largura (colunas)
                            <input
                                type="number"
                                min={1}
                                value={mapConfig.cenario.sizeX}
                                onChange={handleNumberChange("sizeX")}
                            />
                        </label>

                        <label className={styles.field}>
                            Altura (linhas)
                            <input
                                type="number"
                                min={1}
                                value={mapConfig.cenario.sizeY}
                                onChange={handleNumberChange("sizeY")}
                            />
                        </label>
                    </div>

                    <Button variant="accent" onClick={handleSave}>
                        Salvar
                    </Button>
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
                        handleObstaclesChange([...mapConfig.cenario.Obstacles, createObstacleFromRect(rect, mapConfig.cenario.Obstacles)])
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
                    panel={<ObstacleDrawer allObstacles={mapConfig.cenario.Obstacles} onChange={updateObstacle} />}
                >
                    {(cellWidth, cellHeight) => (
                        <>
                            {mapConfig.cenario.Obstacles.map((obstacle) => (
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
