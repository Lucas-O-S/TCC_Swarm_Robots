import { SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { Lh2State, SwarmitDeviceInfo, SwarmitProtocol, SwarmitStatus } from "src/Protocols/Swarmit/Swarmit.Protocol";
import { Protocol } from "src/Protocols/Protocol";

// Registro do que a malha SwarmIT está reportando, mais a política de quando
// pedir device-info, calibrar a LH2 e dar START. Fica fora do adapter de
// propósito: nada de Nest nem de serial aqui, então dá para testar a política
// com timestamps na mão.
//
// O problema que isso resolve: o bootloader do swarmit só entrega o controle à
// aplicação depois de um soft reset pedido pela execução anterior, então TODO
// power-on deixa o robô em Bootloader - e nesse estado ele só fala
// SWARMIT_STATUS, que o resto do backend não consome. Sem um START, robô
// ligado é robô invisível.
//
// A calibração LH2 também só é aceita em Bootloader (o lado seguro é quem
// calcula a posição), por isso ela vem ANTES do START no mesmo ciclo.

export interface SwarmitNode {
    address: string;
    status: SwarmitStatus;
    info?: SwarmitDeviceInfo;
    // Última calibração reportada. Separada do `info` porque o info é jogado
    // fora quando o infoGen muda: sem isso o lh2 piscava "não calibrado" a
    // cada mudança, até o device-info novo chegar.
    lh2: Lh2State | null;
    lastSeenAt: number;
    // null = nunca pedido / nunca enviado. Sentinela explícita em vez de 0:
    // com 0, "agora menos nunca" depende da origem do relógio e a primeira
    // rodada podia ser engolida.
    lastInfoRequestAt: number | null;
    startAttempts: number;
    lastStartAt: number | null;
    noImageWarned: boolean;
    calibrateAttempts: number;
    lastCalibrateAt: number | null;
    // bootCount/uptime do device-info no momento do envio da calibração. O net
    // core reinicia o robô depois da última matriz: um info de outro boot quer
    // dizer que o envio foi processado (é o que encerra um forceCalibrate).
    calibrateMark: { bootCount: number; uptimeS: number } | null;
    forceCalibration: boolean;
    calibrationFailedWarned: boolean;
}

export interface SwarmitActions {
    requestInfo: string[];
    calibrate: string[];
    start: string[];
}

export interface SwarmitFleetOptions {
    // O swarmit usa COMMAND_MAX_ATTEMPTS = 5 e COMMAND_ATTEMPT_DELAY = 0.7 s:
    // o START é reenviado até o robô reportar Running.
    maxStartAttempts: number;
    startIntervalMs: number;
    // DEVICE_INFO_REFRESH_INTERVAL = 2 s no swarmit.
    infoRequestIntervalMs: number;
    // Robô que parou de reportar sai da lista (o status é ~1 Hz).
    staleAfterMs: number;
    // Entre um envio da calibração e o próximo: cobre gravar a flash,
    // reiniciar e mandar status + device-info novos antes de concluir que o
    // envio se perdeu.
    maxCalibrateAttempts: number;
    calibrateIntervalMs: number;
}

export const SWARMIT_FLEET_DEFAULTS: SwarmitFleetOptions = {
    maxStartAttempts: 5,
    startIntervalMs: 700,
    infoRequestIntervalMs: 2000,
    staleAfterMs: 15000,
    maxCalibrateAttempts: 5,
    calibrateIntervalMs: 5000,
};

// O que a borda deve fazer com a malha - vem do .env, via adapter.
export interface SwarmitFleetPolicy {
    // MARI_AUTO_START: dar START em robô parado no bootloader com imagem.
    autoStart: boolean;
    // Estações da calibração carregada (LH2_CALIBRATION_FILE). null = a borda
    // não calibra ninguém, só repassa o lh2 que o robô reportar.
    lh2StationCount: number | null;
}

export class SwarmitFleet {

    private readonly nodes = new Map<string, SwarmitNode>();

    private policy: SwarmitFleetPolicy = { autoStart: false, lh2StationCount: null };

    constructor(private readonly options: SwarmitFleetOptions = SWARMIT_FLEET_DEFAULTS) {}

    // Endereço sempre em MAIÚSCULAS: é como o swarmit chaveia (addr_to_hex) e
    // como a tabela do CLI imprime. O parse do header Mari já devolve assim
    // (Protocol.normalizeAddress); normalizar de novo aqui protege quem chamar
    // com endereço digitado à mão - o `-d` do swarmit compara string sem
    // normalizar, e foi assim que um endereço em caixa baixa virou "No device
    // to start" em silêncio.
    private static key(address: string): string {
        return Protocol.normalizeAddress(address);
    }

    configure(policy: Partial<SwarmitFleetPolicy>): void {
        this.policy = { ...this.policy, ...policy };
    }

    onStatus(address: string, status: SwarmitStatus, now: number = Date.now()): SwarmitNode {
        const key = SwarmitFleet.key(address);
        const existing = this.nodes.get(key);

        const node: SwarmitNode = existing ?? {
            address: key,
            status,
            lh2: null,
            lastSeenAt: now,
            lastInfoRequestAt: null,
            startAttempts: 0,
            lastStartAt: null,
            noImageWarned: false,
            calibrateAttempts: 0,
            lastCalibrateAt: null,
            calibrateMark: null,
            forceCalibration: false,
            calibrationFailedWarned: false,
        };

        // info_gen mudou => o bloco device-info que estava em cache envelheceu.
        if (node.info && node.info.infoGen !== status.infoGen) {
            node.info = undefined;
            node.noImageWarned = false;
        }

        // Entrou em Running: o START pegou, zera o orçamento de tentativas
        // para o próximo ciclo de energia.
        if (status.status === SwarmitDeviceStatus.Running) {
            node.startAttempts = 0;
        }

        node.status = status;
        node.lastSeenAt = now;
        this.nodes.set(key, node);
        return node;
    }

    onDeviceInfo(address: string, info: SwarmitDeviceInfo, now: number = Date.now()): void {
        const node = this.nodes.get(SwarmitFleet.key(address));
        if (!node) return;

        // Outro boot desde o envio da calibração: o robô processou (ou perdeu
        // e voltou do zero - quem decide se precisa de novo é o lh2Flags).
        if (node.calibrateMark && SwarmitFleet.rebootedSince(info, node.calibrateMark)) {
            node.calibrateMark = null;
            node.forceCalibration = false;
        }

        node.info = info;
        node.lh2 = SwarmitProtocol.lh2State(info);
        node.lastSeenAt = now;

        // Calibração confirmada: zera o orçamento para uma recalibração futura.
        if (!this.needsCalibration(node)) {
            node.calibrateAttempts = 0;
            node.calibrationFailedWarned = false;
        }
    }

    // O que mandar agora. Já registra o envio nos contadores do nó, então o
    // chamador precisa efetivamente enviar o que veio aqui.
    plan(now: number = Date.now()): SwarmitActions {
        const actions: SwarmitActions = { requestInfo: [], calibrate: [], start: [] };

        for (const node of this.nodes.values()) {

            if (now - node.lastSeenAt > this.options.staleAfterMs)
                continue;

            const state = node.status.status;

            // Quem responde o device-info é o net core, então Running também
            // serve - e precisa: robô que já rodava quando a borda subiu nunca
            // passava pelo Bootloader e ficava sem lh2. Nos estados de
            // transição (Stopping, Resetting, Programming) a resposta
            // envelhece na hora; espera assentar.
            if (state !== SwarmitDeviceStatus.Bootloader && state !== SwarmitDeviceStatus.Running)
                continue;

            // Sem o bloco device-info não se sabe se existe imagem carregada
            // nem se a LH2 está calibrada - e o frame de status não carrega
            // nada disso. Perguntar antes é o que separa automação segura de
            // travar a placa.
            if (!node.info) {
                const ultimoPedido = node.lastInfoRequestAt;
                if (ultimoPedido === null || now - ultimoPedido >= this.options.infoRequestIntervalMs) {
                    node.lastInfoRequestAt = now;
                    actions.requestInfo.push(node.address);
                }
                continue;
            }

            if (state !== SwarmitDeviceStatus.Bootloader)
                continue;

            if (this.needsCalibration(node)) {

                if (node.calibrateAttempts < this.options.maxCalibrateAttempts) {

                    if (node.lastCalibrateAt === null || now - node.lastCalibrateAt >= this.options.calibrateIntervalMs) {
                        node.lastCalibrateAt = now;
                        node.calibrateAttempts += 1;
                        node.calibrateMark = { bootCount: node.info.bootCount, uptimeS: node.info.uptimeS };
                        // O robô reinicia depois da última matriz: o info atual
                        // envelhece. Pede de novo só depois do intervalo, pra
                        // resposta já vir do boot novo.
                        node.info = undefined;
                        node.lastInfoRequestAt = now;
                        actions.calibrate.push(node.address);
                    }

                    // Calibração em andamento: START só depois de confirmar.
                    continue;
                }

                // Esgotou as tentativas: segue para o START. O robô roda sem
                // LH2 e a API bloqueia task pelo lh2 inválido - melhor que
                // deixar ele invisível no bootloader.
            }

            if (!this.policy.autoStart)
                continue;

            if (!SwarmitProtocol.hasImage(node.info))
                continue;

            if (node.startAttempts >= this.options.maxStartAttempts)
                continue;

            if (node.lastStartAt !== null && now - node.lastStartAt < this.options.startIntervalMs)
                continue;

            node.lastStartAt = now;
            node.startAttempts += 1;
            actions.start.push(node.address);
        }

        return actions;
    }

    // Reenvia a calibração mesmo para robô que já reporta calibrado - para
    // quando a arena foi recalibrada (o device-info só traz contagem e flags,
    // não dá para saber se a matriz gravada é a do arquivo). Sem endereço,
    // vale para a frota toda. Só tem efeito com calibração carregada e com o
    // robô em Bootloader. Devolve os endereços marcados.
    forceCalibrate(address?: string): string[] {
        const targets = address === undefined
            ? [...this.nodes.values()]
            : [this.nodes.get(SwarmitFleet.key(address))].filter((n): n is SwarmitNode => n !== undefined);

        for (const node of targets) {
            node.forceCalibration = true;
            node.calibrateAttempts = 0;
            node.lastCalibrateAt = null;
            node.calibrationFailedWarned = false;
        }

        return targets.map((n) => n.address);
    }

    // Calibração LH2 do robô para o estado que sai aos clientes. Robô sem
    // device-info (ou que a malha nunca reportou) = não calibrado.
    lh2Of(address: string): Lh2State {
        return this.nodes.get(SwarmitFleet.key(address))?.lh2 ?? SwarmitProtocol.lh2State(undefined);
    }

    // Robô que respondeu e não tem imagem: não há START possível, só OTA.
    // Devolve quem precisa ser avisado, uma vez por bloco device-info.
    takeNoImageWarnings(): string[] {
        const out: string[] = [];
        for (const node of this.nodes.values()) {
            if (node.noImageWarned) continue;
            if (node.status.status !== SwarmitDeviceStatus.Bootloader) continue;
            if (!node.info || SwarmitProtocol.hasImage(node.info)) continue;
            node.noImageWarned = true;
            out.push(node.address);
        }
        return out;
    }

    // Robô que esgotou as tentativas e continua sem calibração. Uma vez por
    // rodada de tentativas (forceCalibrate ou calibração confirmada rearmam).
    takeCalibrationFailures(): string[] {
        const out: string[] = [];
        for (const node of this.nodes.values()) {
            if (node.calibrationFailedWarned) continue;
            if (node.calibrateAttempts < this.options.maxCalibrateAttempts) continue;
            if (!this.needsCalibration(node)) continue;
            node.calibrationFailedWarned = true;
            out.push(node.address);
        }
        return out;
    }

    list(now: number = Date.now()): SwarmitNode[] {
        return [...this.nodes.values()]
            .filter((n) => now - n.lastSeenAt <= this.options.staleAfterMs)
            .sort((a, b) => a.address.localeCompare(b.address));
    }

    get(address: string): SwarmitNode | undefined {
        return this.nodes.get(SwarmitFleet.key(address));
    }

    // Precisa mandar a calibração carregada? Só decide com device-info em mãos.
    private needsCalibration(node: SwarmitNode): boolean {
        const expected = this.policy.lh2StationCount;
        if (expected === null || !node.info) return false;
        return node.forceCalibration || !SwarmitProtocol.isLh2Calibrated(node.info, expected);
    }

    // bootCount mudou ou o uptime voltou: é outro boot. Os dois porque o
    // uptime sozinho falha quando o envio saiu logo depois de um boot (o
    // uptime novo pode já ter passado o do envio quando o info chega).
    private static rebootedSince(info: SwarmitDeviceInfo, mark: { bootCount: number; uptimeS: number }): boolean {
        return info.bootCount !== mark.bootCount || info.uptimeS < mark.uptimeS;
    }
}
