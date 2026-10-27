import { useState } from 'react';

/** Caixa delimitadora de um elemento, em qualquer unidade (célula, px...) — mesma unidade em todo o conjunto. */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Maior deslocamento (num eixo) que dá pra aplicar a um grupo inteiro de
// itens de uma vez sem nenhum sair dos limites — o grupo anda "em bloco" e
// só para na borda, em vez de cada item travar num ponto diferente.
// Genérico: só depende de origem+tamanho por eixo, não do formato do item
// (retângulo de obstáculo, círculo de robô...).
export function clampGroupDelta(delta: number, items: { origin: number; size: number }[], total: number) {
  let min = -Infinity;
  let max = Infinity;
  for (const { origin, size } of items) {
    min = Math.max(min, -origin);
    max = Math.min(max, total - size - origin);
  }
  return Math.min(max, Math.max(min, delta));
}

// Seleção (única, múltipla via Ctrl/Cmd, em área) por id estável — a mesma
// "entidade" de seleção reaproveitada por qualquer registro de elementos de
// mapa (obstáculos, robôs...), sem saber do formato/geometria de cada um:
// quem chama traduz seus itens pra `ElementBounds` (retângulo, círculo
// aproximado por um retângulo, etc.) antes de usar `selectInRect`, e lida
// sozinho com desenhar/mover — este hook só guarda "quem está selecionado".
// Id (não índice de array) porque o registro é dinâmico — elementos
// entram/saem (robôs conectando, obstáculos sendo criados) sem que a ordem
// no array corresponda a nada estável.
export function useSelectableElements() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectOnly(id: string) {
    setSelectedIds(new Set([id]));
  }

  function clear() {
    setSelectedIds(new Set());
  }

  // Seleciona todo item cujo bounds intersecta `rect`. `additive` (Ctrl/Cmd
  // segurado) soma à seleção existente em vez de substituí-la. Um `rect`
  // sem área (clique sem arrasto) não intersecta nada, então cai no "limpa
  // seleção" quando não aditivo — mesmo fluxo do clique simples de sempre.
  function selectInRect(rect: ElementBounds, bounds: Map<string, ElementBounds>, additive: boolean) {
    const rectEndX = rect.x + rect.width;
    const rectEndY = rect.y + rect.height;

    const hitIds: string[] = [];
    bounds.forEach((b, id) => {
      const bEndX = b.x + b.width;
      const bEndY = b.y + b.height;
      const intersects = b.x < rectEndX && bEndX > rect.x && b.y < rectEndY && bEndY > rect.y;
      if (intersects) hitIds.push(id);
    });

    if (hitIds.length === 0) {
      if (!additive) clear();
      return;
    }

    setSelectedIds((prev) => {
      const next = additive ? new Set(prev) : new Set<string>();
      for (const id of hitIds) next.add(id);
      return next;
    });
  }

  // Remove ids da seleção (item(ns) apagado(s) de fora) — sem reindexação:
  // ids são estáveis, diferente de índice de array.
  function removeIds(ids: Iterable<string>) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  return { selectedIds, setSelectedIds, toggle, selectOnly, clear, selectInRect, removeIds };
}
