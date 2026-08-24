// Abstração de transporte entre o núcleo do simulador (core/) e "a API que
// você quiser" (SIMULADOR_PLANO.md, seção 4 — decisão A). Qualquer
// implementação (MQTT hoje, WS/REST puro amanhã) só precisa respeitar este
// contrato pro resto do simulador não mudar.

export interface FleetTelemetry {
  address: string;
  theta: number;
  posX: number;
  posY: number;
}

export type CommandHandler = (address: string, payloadType: number, body: Uint8Array) => void;

export interface FleetLink {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  onCommand(handler: CommandHandler): void;
  publishTelemetry(entries: FleetTelemetry[]): void;
}
