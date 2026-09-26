import type {
  AreaCorner,
  AreaDirection,
  AreaPattern,
  AreaTraversalSettings,
  TaskAreaDraft,
} from '../../screens/TaskBuilder/useTaskEditor';
import { areaCorners, areaTraversal, zigzagLanes, zigzagMaxLanes } from '../../screens/TaskBuilder/useTaskEditor';
import { useMapSelection } from '../../hooks/useMapElements';
import { Drawer } from '../Drawer/Drawer';
import { Button } from '../Button/Button';
import { Segmented } from '../Segmented/Segmented';
import { DrawerBody, DrawerField, DrawerHint, DrawerRow } from '../Drawer/DrawerForm';
import styles from './AreaDrawer.module.css';

interface AreaDrawerProps {
  /** Todos os blocos da rota — o drawer acha sozinho qual está selecionado pelos ids dos cantos (ver useMapSelection). */
  allAreas: TaskAreaDraft[];
  /** Número de cada ponto (canto ou ponto de zigzag) na rota inteira — mesmo número exibido no mapa. */
  orderById: Map<string, number>;
  onChange: (areaId: string, patch: Partial<AreaTraversalSettings>) => void;
}

const PATTERNS: { value: AreaPattern; label: string }[] = [
  { value: 'perimeter', label: 'Contorno' },
  { value: 'zigzag-h', label: 'Zigzag ↔' },
  { value: 'zigzag-v', label: 'Zigzag ↕' },
];

const DIRECTIONS: { value: AreaDirection; label: string }[] = [
  { value: 'cw', label: '↻ Horário' },
  { value: 'ccw', label: '↺ Anti-horário' },
];

// Painel do bloco selecionado (mesmo padrão do WaypointDrawer, também via
// <MapCanvas panel={...}>) — abre quando a seleção é só de cantos de UM bloco
// (seleção misturada com waypoints unitários fica com o WaypointDrawer, pra
// não abrir dois drawers um em cima do outro). O padrão (contorno/zigzag)
// vem primeiro e decide quais opções aparecem embaixo:
// - contorno: entrada e saída (2×2 posicionado como os cantos no mapa) e o
//   sentido, que só reordena os 2 cantos do meio;
// - zigzag: canto de início e quantidade de pontos (2 por passada) — a saída
//   é consequência disso, só marcada no 2×2.
export function AreaDrawer({ allAreas, orderById, onChange }: AreaDrawerProps) {
  const { selectedIds, clear, removeSelected } = useMapSelection();

  const areaByCornerId = new Map<string, TaskAreaDraft>(
    allAreas.flatMap((a) => areaCorners(a).map((c) => [c.id, a] as const)),
  );
  const selectedAreas = new Set([...selectedIds].map((id) => areaByCornerId.get(id)));
  const area = selectedAreas.size === 1 ? [...selectedAreas][0] : undefined;

  if (!area) {
    return (
      <Drawer open={false} onClose={clear} title="Bloco">
        {null}
      </Drawer>
    );
  }

  const current = area;
  const points = areaTraversal(current);
  const numbers = points.map((p) => orderById.get(p.id) ?? 0);
  const minX = Math.min(current.x1, current.x2);
  const minY = Math.min(current.y1, current.y2);
  const isZigzag = current.pattern !== 'perimeter';

  function renderCornerPicker(
    selected: AreaCorner,
    onPick: (corner: AreaCorner) => void,
    { disabled, marked }: { disabled?: AreaCorner; marked?: AreaCorner } = {},
  ) {
    return (
      <div className={styles.cornerGrid}>
        {areaCorners(current).map((c) => (
          <button
            key={c.corner}
            type="button"
            className={[
              styles.cornerButton,
              selected === c.corner ? styles.cornerButtonActive : '',
              marked === c.corner ? styles.cornerButtonMarked : '',
            ].join(' ')}
            style={{ gridColumn: c.x === minX ? 1 : 2, gridRow: c.y === minY ? 1 : 2 }}
            onClick={() => onPick(c.corner)}
            disabled={c.corner === disabled}
            aria-pressed={selected === c.corner}
          >
            {orderById.get(c.id)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Drawer open onClose={clear} title="Bloco">
      <DrawerBody>
        <DrawerHint>
          Pontos {Math.min(...numbers)}–{Math.max(...numbers)} da rota · {Math.abs(current.x2 - current.x1) + 1}×
          {Math.abs(current.y2 - current.y1) + 1} células
        </DrawerHint>

        <DrawerField as="div" label="Padrão">
          <Segmented options={PATTERNS} value={current.pattern} onChange={(pattern) => onChange(current.id, { pattern })} ariaLabel="Padrão" />
        </DrawerField>

        {!isZigzag && (
          <>
            {/* Entrada e saída nunca podem ser o mesmo canto — o já escolhido no outro campo fica desabilitado. */}
            <DrawerRow>
              <DrawerField as="div" label="Entrada">
                {renderCornerPicker(current.entry, (entry) => onChange(current.id, { entry }), {
                  disabled: current.exit,
                })}
              </DrawerField>

              <DrawerField as="div" label="Saída">
                {renderCornerPicker(current.exit, (exit) => onChange(current.id, { exit }), {
                  disabled: current.entry,
                })}
              </DrawerField>
            </DrawerRow>

            <DrawerField as="div" label="Sentido">
              <Segmented
                options={DIRECTIONS}
                value={current.direction}
                onChange={(direction) => onChange(current.id, { direction })}
                ariaLabel="Sentido"
              />
            </DrawerField>

            <DrawerHint>
              Os 4 cantos são sempre percorridos: entrada primeiro, saída por último. O sentido define a ordem dos 2
              cantos do meio, girando a partir da entrada.
            </DrawerHint>
          </>
        )}

        {isZigzag && (
          <>
            <DrawerRow>
              <DrawerField as="div" label="Início">
                {/*
                  Se o início cair no canto que é a saída do contorno, troca os
                  dois — senão, ao voltar pro contorno, entrada = saída.
                */}
                {renderCornerPicker(
                  current.entry,
                  (entry) =>
                    onChange(current.id, entry === current.exit ? { entry, exit: current.entry } : { entry }),
                  { marked: points.at(-1)?.corner },
                )}
              </DrawerField>

              <DrawerField as="div" label="Pontos">
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.cornerButton}
                    onClick={() => onChange(current.id, { lanes: zigzagLanes(current) - 1 })}
                    disabled={zigzagLanes(current) <= 2}
                    aria-label="Menos pontos"
                  >
                    −
                  </button>
                  <span className={styles.stepperValue}>{points.length}</span>
                  <button
                    type="button"
                    className={styles.cornerButton}
                    onClick={() => onChange(current.id, { lanes: zigzagLanes(current) + 1 })}
                    disabled={zigzagLanes(current) >= zigzagMaxLanes(current)}
                    aria-label="Mais pontos"
                  >
                    +
                  </button>
                </div>
                <span className={styles.fieldHint}>
                  {zigzagLanes(current)} passadas (máx. {zigzagMaxLanes(current)})
                </span>
              </DrawerField>
            </DrawerRow>

            <DrawerHint>
              Passadas {current.pattern === 'zigzag-h' ? 'horizontais' : 'verticais'} de lado a lado, começando no
              canto de início. A saída (canto tracejado) depende do início e da quantidade de passadas.
            </DrawerHint>
          </>
        )}

        <Button variant="outline" onClick={removeSelected}>
          Remover bloco
        </Button>
      </DrawerBody>
    </Drawer>
  );
}
