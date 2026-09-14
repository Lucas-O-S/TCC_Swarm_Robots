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
import { useObstacleEditor } from "./useObstacleEditor";
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

    function updateObstacle(index: number, patch: Partial<ObstaclesModel>) {
        handleObstaclesChange(
            mapConfig.cenario.Obstacles.map((o, i) => (i === index ? { ...o, ...patch } : o))
        );
    }

    const [tool, setTool] = useState<Tool>("move");
    const obstacleTool = tool === "obstacle";
    const canMoveObstacle = tool === "select" || tool === "obstacle";

    const { rectFor, previewRect, marqueeRect, removeObstacle, removeSelected, selectedIndices, clearSelection, gridHandlers } =
        useObstacleEditor({
            tool,
            sizeX: mapConfig.cenario.sizeX,
            sizeY: mapConfig.cenario.sizeY,
            obstacles: mapConfig.cenario.Obstacles,
            onChange: handleObstaclesChange,
        });

    const selectedObstacles = Array.from(selectedIndices)
        .sort((a, b) => a - b)
        .map((index) => mapConfig.cenario.Obstacles[index]);

    function handleObstacleDrawerChange(patch: Partial<ObstaclesModel>) {
        const [onlyIndex] = selectedIndices;
        if (selectedIndices.size === 1 && onlyIndex !== undefined) updateObstacle(onlyIndex, patch);
    }

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
        <ObstacleDrawer
            obstacles={selectedObstacles}
            onChangeSingle={handleObstacleDrawerChange}
            onRemove={removeSelected}
            onClose={clearSelection}
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
                    tools={
                        <MapToolButton
                            active={obstacleTool}
                            onClick={() => setTool(obstacleTool ? "move" : "obstacle")}
                            title="Desenhar obstáculo (arraste no mapa)"
                        >
                            <ObstacleIcon />
                        </MapToolButton>
                    }
                    {...gridHandlers}
                >
                    {(cellWidth, cellHeight) => (
                        <>
                            {mapConfig.cenario.Obstacles.map((obstacle, index) => {
                                const rect = rectFor(obstacle, index);
                                return (
                                    <Obstacle
                                        key={index}
                                        label={obstacle.name}
                                        title={obstacleTool ? `${obstacle.name} (duplo clique remove)` : obstacle.name}
                                        width={rect.sizeX * cellWidth}
                                        height={rect.sizeY * cellHeight}
                                        className={[
                                            canMoveObstacle ? styles.placedObstacle : undefined,
                                            selectedIndices.has(index) ? styles.selectedObstacle : undefined,
                                        ]
                                            .filter(Boolean)
                                            .join(" ") || undefined}
                                        onDoubleClick={obstacleTool ? () => removeObstacle(index) : undefined}
                                        style={{
                                            position: "absolute",
                                            left: rect.startPointX * cellWidth,
                                            top: rect.startPointY * cellHeight,
                                        }}
                                    />
                                );
                            })}

                            {previewRect && (
                                <Obstacle
                                    width={previewRect.sizeX * cellWidth}
                                    height={previewRect.sizeY * cellHeight}
                                    className={styles.obstaclePreview}
                                    style={{
                                        position: "absolute",
                                        left: previewRect.startPointX * cellWidth,
                                        top: previewRect.startPointY * cellHeight,
                                    }}
                                />
                            )}

                            {marqueeRect && (
                                <div
                                    className={styles.marqueeSelection}
                                    style={{
                                        position: "absolute",
                                        left: marqueeRect.startPointX * cellWidth,
                                        top: marqueeRect.startPointY * cellHeight,
                                        width: marqueeRect.sizeX * cellWidth,
                                        height: marqueeRect.sizeY * cellHeight,
                                    }}
                                />
                            )}
                        </>
                    )}
                </MapCanvas>
            )}
        </MapMenuLayout>
        </>
    )

}
