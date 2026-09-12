import type { ChangeEvent } from "react";
import { useState } from "react";
import type { CenarioModel } from "../../model/Cenario.Model";
import type { ObstaclesModel } from "../../model/Obstacles.Model";
import type { MapModel } from "../../model/Map.Model";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../../Consts/MapConsts";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";
import { MapMenuLayout } from "../../components/MapMenuLayout/MapMenuLayout";
import { Menu } from "../../components/Menu/Menu";
import { Obstacle } from "../../components/Obstacle/Obstacle";
import { useObstacleEditor } from "./useObstacleEditor";
import styles from "./CenarioBuilder.module.css";

export function CenarioBuilder() {

    const [mapConfig, setMapConfig] = useState<MapModel>({
        cenario: {
            sizeX: DEFAULT_COLS,
            sizeY: DEFAULT_ROWS,
            name: "",
            description: "",
            Obstacles: []
        },
        robots: []
    });

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

    const { rectFor, previewRect, removeObstacle, gridHandlers } = useObstacleEditor({
        sizeX: mapConfig.cenario.sizeX,
        sizeY: mapConfig.cenario.sizeY,
        obstacles: mapConfig.cenario.Obstacles,
        onChange: handleObstaclesChange,
    });

    return (
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
                </Menu>
            }
        >
            {(maxMapHeight) => (
                <MapCanvas
                    mapModel={mapConfig}
                    fitWidth
                    maxHeight={maxMapHeight}
                    className={styles.editableGrid}
                    {...gridHandlers}
                >
                    {(cellWidth, cellHeight) => (
                        <>
                            {mapConfig.cenario.Obstacles.map((obstacle, index) => {
                                const rect = rectFor(obstacle, index);
                                return (
                                    <Obstacle
                                        key={index}
                                        label={`${obstacle.name} (duplo clique remove)`}
                                        width={rect.sizeX * cellWidth}
                                        height={rect.sizeY * cellHeight}
                                        className={styles.placedObstacle}
                                        onDoubleClick={() => removeObstacle(index)}
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
                        </>
                    )}
                </MapCanvas>
            )}
        </MapMenuLayout>
    )

}
