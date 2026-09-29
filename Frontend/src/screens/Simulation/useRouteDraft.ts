import { useState } from 'react';
import type { Vec2Model } from '../../model/SimWorld.Model';

/** Rota avulsa em montagem: de qual robô e os pontos (mm). */
export interface RouteDraft {
  address: string;
  points: Vec2Model[];
}

/** Aviso quando o ponto clicado cai numa barreira (o controlador AUTO não desvia de nada). */
export const POINT_IN_OBSTACLE_NOTICE = 'Esse ponto fica dentro de uma barreira — o robô vai parar encostado nela.';

/** Título da ferramenta Waypoint quando ela monta rota avulsa (só pra robô em Manual). */
export function routeToolTitle(canDraft: boolean, focusLabel: string, hasFocus: boolean): string {
  if (canDraft) return `Montar rota LH2_WAYPOINTS pra ${focusLabel} (clique no mapa; envie pelo drawer)`;
  return hasFocus
    ? 'Rota avulsa só no modo Manual — em Semi-auto/Auto o robô segue tarefas'
    : 'Selecione um robô em Manual pra montar uma rota';
}

// Rota avulsa (LH2_WAYPOINTS) montada no mapa pra um robô em Manual: o
// estado e as operações, os mesmos na Simulação (modo Simular) e no
// Visualizador. Os pontos chegam já encaixados/limitados (clampPointToArena).
export function useRouteDraft() {
  const [draft, setDraft] = useState<RouteDraft | null>(null);

  /** Soma o ponto à rota do robô (uma rota nova se o rascunho era de outro). */
  function add(address: string, p: Vec2Model) {
    setDraft((prev) => (prev && prev.address === address ? { ...prev, points: [...prev.points, p] } : { address, points: [p] }));
  }

  function move(index: number, p: Vec2Model) {
    setDraft((prev) => (prev ? { ...prev, points: prev.points.map((q, i) => (i === index ? p : q)) } : prev));
  }

  /** Remove pelo PONTO (não pelo índice): apagar vários selecionados chama isto uma vez por ponto, e o índice mudaria a cada remoção. */
  function remove(index: number) {
    const target = draft?.points[index];
    if (!target) return;
    setDraft((prev) => {
      if (!prev) return prev;
      const points = [...prev.points];
      const k = points.findIndex((q) => q.x === target.x && q.y === target.y);
      if (k >= 0) points.splice(k, 1);
      return { ...prev, points };
    });
  }

  return {
    draft,
    add,
    move,
    remove,
    clear: () => setDraft(null),
    /** O rascunho, se for do robô em foco. */
    visibleFor: (address: string | null) => (draft && draft.address === address ? draft : null),
  };
}
