import { SwarmitDeviceStatus } from "src/Enums/SwarmitDeviceStatus.enum";
import { SwarmitDeviceInfo, SwarmitProtocol, SwarmitStatus } from "src/Protocols/Swarmit/Swarmit.Protocol";

// Registro do que a malha SwarmIT está reportando, mais a política de quando
// dar START. Fica fora do adapter de propósito: nada de Nest nem de serial
// aqui, então dá para testar a política com timestamps na mão.
//
// O problema que isso resolve: o bootloader do swarmit só entrega o controle à
// aplicação depois de um soft reset pedido pela execução anterior, então TODO
// power-on deixa o robô em Bootloader - e nesse estado ele só fala
// SWARMIT_STATUS, que o resto do backend não consome. Sem um START, robô
// ligado é robô invisível.

export interface SwarmitNode {
    address: string;
    status: SwarmitStatus;
    info?: SwarmitDeviceInfo;
    lastSeenAt: number;
    // null = nunca pedido / nunca enviado. Sentinela explícita em vez de 0:
    // com 0, "agora menos nunca" depende da origem do relógio e a primeira
    // rodada podia ser engolida.
    lastInfoRequestAt: number | null;
    startAttempts: number;
    lastStartAt: number | null;
    noImageWarned: boolean;
}

export interface SwarmitActions {
    requestInfo: string[];
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
}

export const SWARMIT_FLEET_DEFAULTS: SwarmitFleetOptions = {
    maxStartAttempts: 5,
    startIntervalMs: 700,
    infoRequestIntervalMs: 2000,
    staleAfterMs: 15000,
};

export class SwarmitFleet {

    private readonly nodes = new Map<string, SwarmitNode>();

    constructor(private readonly options: SwarmitFleetOptions = SWARMIT_FLEET_DEFAULTS) {}

    // Endereço sempre em MAIÚSCULAS: é como o swarmit chaveia (addr_to_hex) e
    // como a tabela do CLI imprime. O parse do header Mari devolve minúsculas,
    // e o `-d` do swarmit compara string sem normalizar - foi assim que um
    // endereço em caixa baixa virou "No device to start" em silêncio.
    private static key(address: string): string {
        return address.toUpperCase();
    }

    onStatus(address: string, status: SwarmitStatus, now: number = Date.now()): SwarmitNode {
        const key = SwarmitFleet.key(address);
        const existing = this.nodes.get(key);

        const node: SwarmitNode = existing ?? {
            address: key,
            status,
            lastSeenAt: now,
            lastInfoRequestAt: null,
            startAttempts: 0,
            lastStartAt: null,
            noImageWarned: false,
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
        node.info = info;
        node.lastSeenAt = now;
    }

    // O que mandar agora. Já registra o envio nos contadores do nó, então o
    // chamador precisa efetivamente enviar o que veio aqui.
    plan(now: number = Date.now()): SwarmitActions {
        const actions: SwarmitActions = { requestInfo: [], start: [] };

        for (const node of this.nodes.values()) {
            if (now - node.lastSeenAt > this.options.staleAfterMs) continue;
            if (node.status.status !== SwarmitDeviceStatus.Bootloader) continue;

            // Sem o bloco device-info não se sabe se existe imagem carregada -
            // e o frame de status não carrega essa informação. Perguntar antes
            // é o que separa automação segura de travar a placa.
            if (!node.info) {
                const ultimoPedido = node.lastInfoRequestAt;
                if (ultimoPedido === null || now - ultimoPedido >= this.options.infoRequestIntervalMs) {
                    node.lastInfoRequestAt = now;
                    actions.requestInfo.push(node.address);
                }
                continue;
            }

            if (!SwarmitProtocol.hasImage(node.info)) continue;

            if (node.startAttempts >= this.options.maxStartAttempts) continue;
            if (node.lastStartAt !== null && now - node.lastStartAt < this.options.startIntervalMs) continue;

            node.lastStartAt = now;
            node.startAttempts += 1;
            actions.start.push(node.address);
        }

        return actions;
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

    list(now: number = Date.now()): SwarmitNode[] {
        return [...this.nodes.values()]
            .filter((n) => now - n.lastSeenAt <= this.options.staleAfterMs)
            .sort((a, b) => a.address.localeCompare(b.address));
    }

    get(address: string): SwarmitNode | undefined {
        return this.nodes.get(SwarmitFleet.key(address));
    }
}
