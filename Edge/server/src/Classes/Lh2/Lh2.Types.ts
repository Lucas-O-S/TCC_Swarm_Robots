import { Lh2Sample, Lh2State } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2CaptureView } from "src/adapter/Mari/Lh2CaptureSession";
import { Lh2Area } from "src/Protocols/Swarmit/Lh2Layout";

/** Um robô da malha SwarmIT, do ponto de vista da calibração LH2. */
export interface Lh2RobotView {
    address: string;
    // Estado SwarmIT (Bootloader, Running...). A calibração só é aceita em Bootloader.
    status: string;
    // Último device-info (null = ainda não respondeu).
    lh2: Lh2State | null;
    // Bate com o arquivo carregado: mesma contagem de estações + bit VALID.
    // null = nenhum arquivo carregado ou ainda sem device-info.
    matchesFile: boolean | null;
    calibrateAttempts: number;
    // forceCalibrate pedido e ainda não processado pelo robô.
    forcePending: boolean;
}

/** [metadata] do TOML carregado: lado do quadrado (dele sai a arena), tag e data. */
export interface Lh2CalibrationMetaView {
    distanceMm: number;
    tag: string | null;
    // ISO 8601 (UTC); null se o TOML não trouxer.
    createdAt: string | null;
    // Canto top-left do quadrado no referencial (mm). No layout do PyDotBot = 2 × o lado.
    squareX: number;
    squareY: number;
    // Área real no referencial (mm); null = layout do PyDotBot (sem área informada).
    area: Lh2Area | null;
    // TOML de onde esta saiu por recálculo; null se veio de uma captura.
    reframedFrom: string | null;
}

/** Resposta do GET /v1/lh2/calibration. */
export interface Lh2CalibrationView {
    // false = transporte sem SwarmIT (simulador/MQTT): não há o que calibrar.
    supported: boolean;
    // Arquivo carregado (null = LH2_CALIBRATION_FILE vazio).
    file: string | null;
    // Slots do arquivo (= lh2HomographyCount do robô calibrado com ele).
    stationCount: number | null;
    // Canais com matriz de verdade (os slots zerados ficam de fora).
    channels: number[] | null;
    // null = nada carregado, calibration.out legado ou TOML sem lado.
    metadata: Lh2CalibrationMetaView | null;
    robots: Lh2RobotView[];
}

/** Resposta do POST /v1/lh2/calibration/push. */
export interface Lh2PushResult {
    marked: string[];
    // Marcados mas fora do Bootloader: só recebem quando pararem (o net core
    // ignora a calibração em Running).
    notInBootloader: string[];
}

/** Resposta do POST /v1/lh2/calibration/session/capture. */
export interface Lh2CornerResult {
    corner: Lh2Corner;
    sample: Lh2Sample;
    session: Lh2CaptureView;
}

/** Resposta do POST /v1/lh2/calibration/reframe. */
export interface Lh2ReframeResult {
    // TOML novo, já carregado.
    file: string;
    // Calibração que foi recalculada.
    from: string;
    metadata: Lh2CalibrationMetaView | null;
    stationCount: number;
    channels: number[];
    marked: string[];
    notInBootloader: string[];
}

/** Resposta do POST /v1/lh2/calibration/session/solve. */
export interface Lh2SolveResult {
    // TOML gravado (formato do PyDotBot 0.30.0) e já carregado pela borda.
    file: string;
    // Leituras cruas dos 4 cantos, ao lado do TOML (<nome>.corners.json).
    cornersFile: string;
    metadata: Lh2CalibrationMetaView | null;
    stationCount: number;
    channels: number[];
    // Robôs que vão receber a calibração nova (a frota toda).
    marked: string[];
    // Só recebem quando estiverem em Bootloader.
    notInBootloader: string[];
}
