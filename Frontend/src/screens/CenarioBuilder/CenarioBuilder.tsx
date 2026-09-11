import { useState } from "react";
import type { MapModel } from "../../model/Map.Model";
import { DEFAULT_COLS, DEFAULT_ROWS } from "../../Consts/MapConsts";
import { MapCanvas } from "../../components/MapCanvas/MapCanvas";



export function CenarioBuilder() {


     

    const [mapSizeX, setMapSizeX] = useState<number>(DEFAULT_COLS);
    const [mapSizeY, setMapSizeY] = useState<number>(DEFAULT_ROWS);
    


    const  [mapConfig, setMapConfig] = useState<MapModel>({
        cenario : {
            sizeX: mapSizeX,
            sizeY: mapSizeY,
            name: "",
            description: "",
            obstacles: false,
            Obstacles: []
        },
        robots: []
    });


    return (
        <MapCanvas mapModel={mapConfig}>


        </MapCanvas>
    )


}