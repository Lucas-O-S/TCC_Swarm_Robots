import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { CenarioModel } from "../../model/Cenario.Model";
import type { MapModel } from "../../model/Map.Model";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../../Consts/MapConsts";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";
import { Card } from "../../components/Card/Card";
import styles from "./CenarioBuilder.module.css";

// Espaço reservado abaixo do mapa (bate com o padding-bottom de .screen) pra
// ele não colar na borda inferior da tela.
const SCREEN_BOTTOM_GAP = 28;

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

    const mapColumnRef = useRef<HTMLDivElement>(null);
    const [maxMapHeight, setMaxMapHeight] = useState<number>();

    useEffect(() => {
        function updateMaxHeight() {
            if (!mapColumnRef.current) return;
            const top = mapColumnRef.current.getBoundingClientRect().top;
            setMaxMapHeight(Math.max(0, window.innerHeight - top - SCREEN_BOTTOM_GAP));
        }

        updateMaxHeight();
        window.addEventListener("resize", updateMaxHeight);
        return () => window.removeEventListener("resize", updateMaxHeight);
    }, []);

    return (
        <div className={styles.screen}>
            <div className={styles.body}>
                <div className={styles.mapColumn} ref={mapColumnRef}>
                    <MapCanvas mapModel={mapConfig} fitWidth maxHeight={maxMapHeight} />
                </div>

                <aside className={styles.menu}>
                    <Card className={styles.configCard}>
                        <h3 className={styles.cardTitle}>Configuração do mapa</h3>

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

                    </Card>
                </aside>
            </div>
        </div>
    )

}