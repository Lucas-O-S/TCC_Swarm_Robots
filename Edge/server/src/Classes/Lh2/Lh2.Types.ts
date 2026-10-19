import { Lh2Sample, Lh2State } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Lh2Corner } from "src/Enums/Lh2Corner.enum";
import { Lh2CaptureView } from "src/adapter/Mari/Lh2CaptureSession";

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

/** Resposta do GET /v1/lh2/calibration. */
export interface Lh2CalibrationView {
    // false = transporte sem SwarmIT (simulador/MQTT): não há o que calibrar.
    supported: boolean;
    // Arquivo carregado (null = LH2_CALIBRATION_FILE vazio).
    file: string | null;
    stationCount: number | null;
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

/** Resposta do POST /v1/lh2/calibration/session/solve. */
export interface Lh2SolveResult {
    // TOML gravado (formato do PyDotBot 0.30.0) e já carregado pela borda.
    file: string;
    stationCount: number;
    // Robôs que vão receber a calibração nova (a frota toda).
    marked: string[];
    // Só recebem quando estiverem em Bootloader.
    notInBootloader: string[];
}
