import { useRef } from 'react';

// Ids de seleção do mapa da Simulação (src/hooks/useMapElements.tsx seleciona
// por id estável). Prefixo por tipo pra um address de robô nunca colidir com
// o id de uma barreira e pros drawers acharem "os seus" na seleção.
export const robotSelId = (address: string) => `rob:${address}`;
export const obstacleSelId = (id: string) => `obs:${id}`;
export const waypointSelId = (address: string, index: number) => `wp:${address}:${index}`;
export const draftSelId = (index: number) => `rd:${index}`;

/** Robô "em foco" pela seleção: o próprio robô ou um waypoint dele. */
export function robotFromSelection(ids: ReadonlySet<string>): string | null {
  for (const id of ids) {
    if (id.startsWith('rob:')) return id.slice(4);
    if (id.startsWith('wp:')) return id.split(':')[1] ?? null;
  }
  return null;
}

export function obstaclesFromSelection(ids: ReadonlySet<string>): string[] {
  return [...ids].filter((id) => id.startsWith('obs:')).map((id) => id.slice(4));
}

export function hasDraftSelection(ids: ReadonlySet<string>): boolean {
  return [...ids].some((id) => id.startsWith('rd:'));
}

/**
 * Robô em foco (drawer + ferramenta Waypoint), na Simulação e no
 * Visualizador: o robô selecionado, ou o dono do rascunho quando um ponto
 * dele está selecionado. Com `keep` (ferramenta Waypoint ligada) o foco
 * "gruda": clicar no mapa pra criar ponto não pode perder o robô-alvo.
 */
export function useStickyFocus(selectedIds: ReadonlySet<string>, draftOwner: string | null, keep: boolean): string | null {
  const focus = useRef<string | null>(null);
  const fromSelection = robotFromSelection(selectedIds) ?? (hasDraftSelection(selectedIds) ? draftOwner : null);
  if (fromSelection) focus.current = fromSelection;
  else if (!keep) focus.current = null;
  return focus.current;
}
