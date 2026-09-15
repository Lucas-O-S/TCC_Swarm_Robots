import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { clampGroupDelta, useSelectableElements } from './useSelectableElements';
import type { ElementBounds } from './useSelectableElements';

interface ElementDescriptor {
  bounds: ElementBounds;
  selectable: boolean;
  movable: boolean;
  onMove?: (next: { x: number; y: number }) => void;
  removable: boolean;
  onRemove?: () => void;
}

interface DragState {
  grabId: string;
  /** Posição (px) de cada elemento arrastado junto, no instante em que o arrasto começou. */
  origins: Map<string, { x: number; y: number }>;
  grabX: number;
  grabY: number;
  curX: number;
  curY: number;
}

interface MapElementsContextValue {
  selectedIds: Set<string>;
  drag: DragState | null;
  dragDelta: { x: number; y: number } | null;
  register: (id: string, descriptor: ElementDescriptor) => void;
  unregister: (id: string) => void;
  toggleSelected: (id: string) => void;
  selectOnly: (id: string) => void;
  clearSelection: () => void;
  removeSelected: () => void;
}

const MapElementsContext = createContext<MapElementsContextValue | null>(null);

// Estado + handlers de pointer da "entidade" selecionável/movível de mapa.
// Por padrão o próprio <MapCanvas> chama isso e provê o contexto sozinho —
// nenhuma tela precisa disso diretamente. A exceção é quando um painel
// precisa ler a seleção de FORA da árvore do <MapCanvas> (ex.: uma lista
// lateral no layout normal da tela, não um drawer sobreposto): aí a tela
// chama `useMapElementsState()` ela mesma, envolve tanto o <MapCanvas>
// quanto o painel num <MapElementsProvider value={...}> e passa o mesmo
// objeto de volta pro <MapCanvas> via prop `elements` (ver DashboardScreen).
//
// Qualquer elemento dentro (Obstacle, Robot...) se registra via
// `useMapElement` com `selectable`/`movable`/`removable`, e ganha de graça:
// clique seleciona, Ctrl/Cmd+clique soma à seleção, arrastar move o grupo
// selecionado inteiro (parando na borda do mapa em vez de sair),
// Backspace/Delete remove quem for `removable`. Célula vazia (nenhum
// elemento registrado ali) não faz nada aqui — o gesto sobe pro MapViewport
// (pan/seleção em área) ou pro que a tela quiser (ex.: desenhar um
// obstáculo novo).
export function useMapElementsState() {
  const registry = useRef(new Map<string, ElementDescriptor>());
  const selection = useSelectableElements();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const dragDelta = useMemo(() => {
    if (!drag) return null;
    const xItems: { origin: number; size: number }[] = [];
    const yItems: { origin: number; size: number }[] = [];
    drag.origins.forEach((origin, id) => {
      const bounds = registry.current.get(id)?.bounds;
      if (!bounds) return;
      xItems.push({ origin: origin.x, size: bounds.width });
      yItems.push({ origin: origin.y, size: bounds.height });
    });
    return {
      x: clampGroupDelta(drag.curX - drag.grabX, xItems, viewportSize.width),
      y: clampGroupDelta(drag.curY - drag.grabY, yItems, viewportSize.height),
    };
  }, [drag, viewportSize]);

  function register(id: string, descriptor: ElementDescriptor) {
    registry.current.set(id, descriptor);
  }

  function unregister(id: string) {
    registry.current.delete(id);
    selection.removeIds([id]);
  }

  function pointFromEvent(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * viewportSize.width,
      y: ((e.clientY - rect.top) / rect.height) * viewportSize.height,
    };
  }

  // Último elemento registrado que bate no ponto "ganha" (ordem de registro
  // segue ordem de render, então empate favorece quem está visualmente por cima).
  function hitTest(x: number, y: number): string | null {
    let hit: string | null = null;
    registry.current.forEach((d, id) => {
      if (!d.selectable) return;
      const { bounds } = d;
      if (x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height) hit = id;
    });
    return hit;
  }

  // Cada handler devolve se "tratou" o evento (achou algo registrado ali /
  // já havia um arrasto genérico em curso) — quem chama (MapCanvas) usa
  // isso pra saber se pode tentar sua própria lógica (ex.: desenhar um
  // elemento novo em célula vazia) ou deixar o gesto subir pro MapViewport.
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>): boolean {
    const { x, y } = pointFromEvent(e);
    const hitId = hitTest(x, y);
    if (!hitId) return false; // célula vazia — não mexe, deixa o gesto subir

    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      selection.toggle(hitId);
      return true;
    }

    const descriptor = registry.current.get(hitId);
    if (!descriptor?.movable) {
      selection.selectOnly(hitId);
      return true;
    }

    // Clicou num elemento que já fazia parte da seleção: arrasta o grupo
    // inteiro (só quem for `movable`). Senão, a seleção vira só ele.
    const group = selection.selectedIds.has(hitId) ? Array.from(selection.selectedIds) : [hitId];
    if (!selection.selectedIds.has(hitId)) selection.selectOnly(hitId);

    e.currentTarget.setPointerCapture(e.pointerId);
    const origins = new Map<string, { x: number; y: number }>();
    for (const id of group) {
      const bounds = registry.current.get(id)?.bounds;
      if (registry.current.get(id)?.movable && bounds) origins.set(id, { x: bounds.x, y: bounds.y });
    }
    setDrag({ grabId: hitId, origins, grabX: x, grabY: y, curX: x, curY: y });
    return true;
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>): boolean {
    if (!drag) return false;
    e.stopPropagation();
    const { x, y } = pointFromEvent(e);
    setDrag((prev) => (prev ? { ...prev, curX: x, curY: y } : prev));
    return true;
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>): boolean {
    if (!drag) return false;
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);

    const moved = drag.curX !== drag.grabX || drag.curY !== drag.grabY;
    if (!moved) {
      // Sem arrasto real (clique simples) — seleciona só esse elemento, em
      // vez de "mover" o grupo pro mesmo lugar, senão nunca dava pra clicar
      // num elemento parado sem desfazer a seleção múltipla.
      selection.selectOnly(drag.grabId);
    } else if (dragDelta) {
      drag.origins.forEach((origin, id) => {
        registry.current.get(id)?.onMove?.({ x: origin.x + dragDelta.x, y: origin.y + dragDelta.y });
      });
    }

    setDrag(null);
    return true;
  }

  function cancelDrag() {
    setDrag(null);
  }

  // Seleciona todo elemento registrado que intersecta `rect` (px — vem do
  // onAreaSelect do MapViewport). `additive`: soma à seleção (Ctrl/Cmd).
  function selectInRect(rect: ElementBounds, additive: boolean) {
    const bounds = new Map<string, ElementBounds>();
    registry.current.forEach((d, id) => {
      if (d.selectable) bounds.set(id, d.bounds);
    });
    selection.selectInRect(rect, bounds, additive);
  }

  // Chama onRemove de cada selecionado que for `removable` — usado tanto
  // pelo atalho de teclado quanto por quem quiser um botão "remover
  // selecionados" (ver useMapSelection).
  function removeSelected() {
    for (const id of selection.selectedIds) {
      const d = registry.current.get(id);
      if (d?.removable) d.onRemove?.();
    }
  }

  // Backspace/Delete apaga a seleção — exceto com o foco num campo de texto
  // (editar nome/descrição não pode virar sinônimo de apagar o elemento).
  useLayoutEffect(() => {
    if (selection.selectedIds.size === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      const hasRemovable = Array.from(selection.selectedIds).some((id) => registry.current.get(id)?.removable);
      if (!hasRemovable) return;

      e.preventDefault();
      removeSelected();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.selectedIds]);

  const contextValue: MapElementsContextValue = {
    selectedIds: selection.selectedIds,
    drag,
    dragDelta,
    register,
    unregister,
    toggleSelected: selection.toggle,
    selectOnly: selection.selectOnly,
    clearSelection: selection.clear,
    removeSelected,
  };

  return {
    contextValue,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: cancelDrag,
    },
    selectInRect,
    clearSelection: selection.clear,
    setViewportSize,
  };
}

/** Objeto devolvido por `useMapElementsState()` — o que uma tela guarda/passa quando precisa criar o estado ela mesma (ver comentário acima). */
export type MapElementsController = ReturnType<typeof useMapElementsState>;

export function MapElementsProvider({
  value,
  children,
}: {
  value: MapElementsContextValue;
  children: ReactNode;
}) {
  return <MapElementsContext.Provider value={value}>{children}</MapElementsContext.Provider>;
}

interface UseMapElementArgs {
  /** Sem id, o elemento não se registra (não seleciona/move/remove) — uso puramente decorativo (ex.: preview de criação). */
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Participa de clique/Ctrl+clique/seleção em área. Default true. */
  selectable?: boolean;
  /** Participa de arrastar-pra-mover (grupo, com a posição resultante em `onMove`). Default false. */
  movable?: boolean;
  onMove?: (next: { x: number; y: number }) => void;
  /** Participa de Backspace/Delete quando selecionado. Default false. */
  removable?: boolean;
  onRemove?: () => void;
}

// Ponto de entrada pra qualquer elemento de mapa "derivar" da entidade
// selecionável/movível: registra bounds+capacidades a cada render, devolve
// se está selecionado e a posição (px) já ajustada pro arrasto em curso —
// quem usa só aplica `x`/`y` no style, sem saber nada de seleção/arrasto.
export function useMapElement({
  id,
  x,
  y,
  width,
  height,
  selectable = true,
  movable = false,
  onMove,
  removable = false,
  onRemove,
}: UseMapElementArgs) {
  const ctx = useContext(MapElementsContext);
  if (!ctx) {
    throw new Error('useMapElement precisa estar dentro do <MapCanvas> (que já provê o contexto).');
  }

  useLayoutEffect(() => {
    if (!id) return;
    ctx.register(id, { bounds: { x, y, width, height }, selectable, movable, onMove, removable, onRemove });
  });

  useLayoutEffect(() => {
    if (!id) return;
    // Só quando `id` muda (ou desmonta) — não a cada render. `contextValue`
    // é recriado a cada render de quem chama `useMapElementsState`, então
    // depender de `ctx` aqui faria este cleanup rodar toda hora (inclusive
    // por mudanças de estado sem relação nenhuma), removendo o elemento da
    // seleção sempre que algo mais na tela mudasse. `ctx.unregister` opera
    // sobre um registro (`useRef`) e um `setState` estáveis, então continua
    // correto mesmo vindo de uma closure de um render anterior.
    return () => ctx.unregister(id);
  }, [id]);

  const dragOrigin = id && movable ? ctx.drag?.origins.get(id) : undefined;
  const renderX = dragOrigin && ctx.dragDelta ? dragOrigin.x + ctx.dragDelta.x : x;
  const renderY = dragOrigin && ctx.dragDelta ? dragOrigin.y + ctx.dragDelta.y : y;

  return { selected: id ? ctx.selectedIds.has(id) : false, x: renderX, y: renderY };
}

// Leitura (+ selecionar/limpar/remover) da seleção, pra painéis/drawers que
// mostram detalhe de quem está selecionado sem precisar saber nada de
// pointer/arrasto. Dois jeitos de um painel enxergar este contexto,
// dependendo de onde ele mora na tela:
// - Drawer/overlay de posição fixa (ex.: ObstacleDrawer): passe via
//   <MapCanvas panel={...}> — fica fora da área com pan/zoom (ver
//   comentário no MapCanvas), mas ainda dentro do Provider.
// - Painel de layout normal em outro lugar da tela (ex.: uma lista
//   lateral): a tela chama `useMapElementsState()` ela mesma, envolve
//   tanto o <MapCanvas> quanto esse painel num <MapElementsProvider>
//   próprio, e passa o mesmo objeto pro <MapCanvas> via prop `elements`
//   (ver DashboardScreen/SimulationScreen).
export function useMapSelection() {
  const ctx = useContext(MapElementsContext);
  if (!ctx) {
    throw new Error(
      'useMapSelection precisa estar dentro de um <MapElementsProvider> — passe o painel via <MapCanvas panel={...}> (overlay fixo) ou envolva tela+painel com o objeto de <MapCanvas elements={...}> (layout normal).',
    );
  }
  return {
    selectedIds: ctx.selectedIds,
    toggle: ctx.toggleSelected,
    selectOnly: ctx.selectOnly,
    clear: ctx.clearSelection,
    removeSelected: ctx.removeSelected,
  };
}
