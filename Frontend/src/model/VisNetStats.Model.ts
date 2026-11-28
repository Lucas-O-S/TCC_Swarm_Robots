import type { RobotStatus } from '../enums/RobotStatus.enum';

/** Média, p95 e extremos de uma série de durações, em ms. */
export interface DurationStatsModel {
  count: number;
  mean: number;
  p95: number;
  min: number;
  max: number;
}

/**
 * Números de rede de um robô (ou da frota inteira) dentro da janela do
 * painel "Rede" do Visualizador. Ver `screens/Visualizer/VisNetStats.ts`.
 */
export interface NetCountsModel {
  /** Anúncios (robot:update) que chegaram. */
  received: number;
  /** Anúncios que faltaram, estimados pelos buracos entre dois seguidos contra a taxa esperada. */
  missed: number;
  /** missed / (received + missed), em %; null = nada na janela. */
  lossPct: number | null;
  /** Borda → navegador: chegada aqui menos o `updatedAt` que a borda carimbou no frame. */
  latency: DurationStatsModel | null;
  /** 1 / intervalo médio entre anúncios seguidos (sem contar as quedas), em Hz. */
  measuredHz: number | null;
  /** Quanto o intervalo entre anúncios seguidos foge da taxa esperada (ms, raiz da média dos quadrados; os perdidos no meio são descontados). */
  intervalJitter: number | null;
  commandsOk: number;
  commandsFailed: number;
  /** Ida e volta dos comandos que deram certo (tela → API → borda → resposta). */
  commandRtt: DurationStatsModel | null;
  /** Saídas de Active (→ Inactive ou Lost) vistas na janela. */
  drops: number;
  /** Viradas pra Lost vistas na janela. */
  losts: number;
}

export interface RobotNetSnapshotModel extends NetCountsModel {
  /** Chave do robô (address em minúsculas, a mesma do VisFleet). */
  key: string;
}

/** Um pedaço da janela, pros gráficos (a janela é dividida em pedaços iguais). */
export interface NetBucketModel {
  /** Início e fim (ms, relógio do navegador). */
  start: number;
  end: number;
  /** Anúncios que chegaram neste pedaço. */
  received: number;
  latencyMean: number | null;
  latencyMax: number | null;
  /** Perda na média móvel (os últimos `lossSpanMs` até o fim do pedaço): faltaram / esperados. */
  lossMissed: number;
  lossExpected: number;
  lossPct: number | null;
}

/** Fotografia da janela inteira: frota, cada robô e os pedaços dos gráficos. */
export interface NetSnapshotModel {
  /** Fim da janela (ms, relógio do navegador). */
  at: number;
  windowMs: number;
  expectedHz: number;
  fleet: NetCountsModel;
  robots: ReadonlyMap<string, RobotNetSnapshotModel>;
  buckets: NetBucketModel[];
  /** Tamanho da média móvel da perda nos gráficos (ms). */
  lossSpanMs: number;
  /** Alguma latência deu negativa: o relógio da borda está adiantado em relação ao navegador. */
  clockSkew: boolean;
}

/** Linha "por robô" do cartão Rede (e o que os avisos de robô fora usam). */
export interface VisNetRowModel {
  address: string;
  label: string;
  color: string;
  status: RobotStatus;
  /** Segundos desde o último anúncio que chegou nesta tela; null = nenhum desde que ela abriu. */
  silenceS: number | null;
  net: RobotNetSnapshotModel | null;
}
