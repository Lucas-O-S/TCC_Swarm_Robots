import type { ServiceResult } from '../services/Robot.Service';
import type { ApiLink, ApiLinkState } from './ApiLink';

/** Aviso único de "sem conexão": aparece no header, no log e no drawer quando um comando é tentado. */
export const API_NOT_CONNECTED = 'Sem conexão com a API: a integração ainda não foi implementada.';

function notConnected<T>(): Promise<ServiceResult<T>> {
  return Promise.resolve({ ok: false, message: API_NOT_CONNECTED });
}

// ApiLink que não conecta em nada, enquanto a conexão com a API não existe
// (pedido do dono: por ora é só a tela). Não abre socket nem faz
// requisição: avisa `unavailable` no start, nunca emite evento e toda
// leitura ou comando volta com API_NOT_CONNECTED. A tela fica só com o
// mapa, sem robôs, porque o Visualizador só mostra robôs que vêm da API.
export class DisconnectedApiLink implements ApiLink {
  private stateCb: ((state: ApiLinkState) => void) | null = null;

  start(): Promise<void> {
    this.stateCb?.({ status: 'unavailable', message: API_NOT_CONNECTED });
    return Promise.resolve();
  }

  stop(): void {}

  onState(cb: (state: ApiLinkState) => void): void {
    this.stateCb = cb;
  }

  onEvent(): void {}

  listRobots() {
    return notConnected<never>();
  }

  getTelemetry() {
    return notConnected<never>();
  }

  listTasks() {
    return notConnected<never>();
  }

  moveRaw() {
    return notConnected<void>();
  }

  rgbLed() {
    return notConnected<void>();
  }

  controlMode() {
    return notConnected<void>();
  }

  waypoints() {
    return notConnected<void>();
  }

  assignTask() {
    return notConnected<void>();
  }

  setWaypointsThreshold() {
    return notConnected<void>();
  }
}
