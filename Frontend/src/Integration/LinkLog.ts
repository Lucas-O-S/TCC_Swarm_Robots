// Log de eventos de link — o do backend de bolso da Simulação
// (LocalFleetLink) e o da API no Visualizador (VisFleet), mostrado pelo
// GatewayLog. Mais recente primeiro, com teto de linhas.

export interface LinkLogEntry {
  id: number;
  /** Instante em segundos (relógio de quem loga: tempo simulado ou desde que a tela abriu). */
  t: number;
  source: 'gateway' | 'backend';
  text: string;
  /** Quantas mensagens iguais em sequência essa linha resume (fluxo do joystick). */
  count: number;
  /** Chave de agrupamento — só existe pras mensagens de fluxo (ver `streamKey`). */
  key?: string;
}

const DEFAULT_MAX = 150;
/** Quantas linhas pra trás procurar uma do mesmo fluxo (as dos dois lados se alternam). */
const STREAM_LOOKBACK = 4;

/**
 * O joystick manda CMD_MOVE_RAW a 20 Hz — uma linha por mensagem afogaria o
 * log. Mensagens de fluxo (mesmo comando/alvo/desfecho, só os valores de
 * L/R mudando) viram UMA linha que se atualiza e conta as repetições.
 */
function streamKey(source: LinkLogEntry['source'], text: string): string | undefined {
  if (!text.includes('CMD_MOVE_RAW')) return undefined;
  return `${source}|${text.replace(/L=-?\d+ R=-?\d+/, 'L=# R=#')}`;
}

export class LinkLog {
  private list: LinkLogEntry[] = [];
  private seq = 0;
  private readonly max: number;

  constructor(max = DEFAULT_MAX) {
    this.max = max;
  }

  /** Mais recente primeiro. */
  get entries(): readonly LinkLogEntry[] {
    return this.list;
  }

  add(source: LinkLogEntry['source'], text: string, t: number): void {
    const key = streamKey(source, text);
    const k = key ? this.list.findIndex((e, i) => i < STREAM_LOOKBACK && e.key === key) : -1;
    if (k >= 0) {
      const prev = this.list[k];
      const merged: LinkLogEntry = { ...prev, id: ++this.seq, t, text, count: prev.count + 1 };
      this.list = [merged, ...this.list.filter((_, i) => i !== k)];
      return;
    }
    const entry: LinkLogEntry = { id: ++this.seq, t, source, text, count: 1, key };
    this.list = [entry, ...this.list].slice(0, this.max);
  }

  clear(): void {
    this.list = [];
  }
}
