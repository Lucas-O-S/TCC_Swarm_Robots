import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Button } from '../Button/Button';
import { DrawerActions, DrawerField, DrawerFieldHint, DrawerHint, DrawerRow, DrawerSubtitle } from '../Drawer/DrawerForm';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { ORCHESTRATOR_RUN_S } from '../../Integration/LocalOrchestrator';
import type { TaskModel } from '../../model/Task.Model';
import styles from './RobotTaskSection.module.css';

interface RobotTaskSectionProps {
  semiAuto: boolean;
  /** A tarefa em andamento, se a lista tiver. */
  task: TaskModel | null;
  /** Tem tarefa atribuída (mesmo que ela não esteja na lista, ex.: a API não mandou). */
  hasTask: boolean;
  /** waypoint_idx do último advertisement (null = sem telemetria). */
  wpIdx: number | null;
  /** waypointsThreshold do robô (mm). */
  threshold: number;
  pendingTasks: readonly TaskModel[];
  /** Segundos até a próxima rodada da fila, quando se sabe; sem isso mostra o intervalo. */
  nextRunIn?: number;
  onAssign: (taskId: string) => void;
  /** Semi-auto: larga a tarefa (o robô para e ela volta pra fila). Sem isso, Cancelar/Trocar não aparecem. */
  onRelease?: () => void;
  /** Semi-auto: troca a tarefa em andamento por outra pendente. */
  onSwitch?: (taskId: string) => void;
  /** Tarefa escolhida no seletor do Semi-auto: o mapa mostra a rota dela antes de atribuir. */
  onPreview: (taskId: string | null) => void;
  /** Raio de chegada, confirmado ao sair do campo ou com Enter. Se devolver um erro, o campo volta ao valor atual. */
  onThreshold: (mm: number) => void | Promise<string | null>;
}

// Tarefa do robô nos drawers (Simulação e Visualizador), modos Semi-auto e
// Auto. A tela não cria tarefa — só escolhe entre as que existem. No
// Semi-auto: sem tarefa, escolher uma pendente (o mapa mostra a rota) e
// Atribuir; com tarefa, progresso + Cancelar/Trocar (quando quem usa
// oferece). No Auto, só acompanhar.
export function RobotTaskSection({
  semiAuto,
  task,
  hasTask,
  wpIdx,
  threshold,
  pendingTasks,
  nextRunIn,
  onAssign,
  onRelease,
  onSwitch,
  onPreview,
  onThreshold,
}: RobotTaskSectionProps) {
  // Não filtra por "tem pontos": a lista da API vem sem eles; quem recusa tarefa vazia é o orquestrador.
  const assignable = pendingTasks.filter((t) => t.uuid !== task?.uuid);
  const [picked, setPicked] = useState('');
  const pickedId = assignable.some((t) => t.uuid === picked) ? picked : (assignable[0]?.uuid ?? '');
  const pickedTask = assignable.find((t) => t.uuid === pickedId) ?? null;
  const canSwitch = onSwitch !== undefined && hasTask;
  const previewId = semiAuto && pickedId && (!hasTask || canSwitch) ? pickedId : null;

  // Mostra no mapa a rota da tarefa escolhida; some ao sair/atribuir.
  const onPreviewRef = useRef(onPreview);
  useEffect(() => {
    onPreviewRef.current = onPreview;
  });
  useEffect(() => {
    onPreviewRef.current(previewId);
  }, [previewId]);
  useEffect(() => () => onPreviewRef.current(null), []);

  function commitThreshold(input: HTMLInputElement) {
    const mm = Math.round(Number(input.value));
    if (!Number.isFinite(mm) || mm <= 0 || mm === threshold) {
      input.value = String(threshold);
      return;
    }
    const result = onThreshold(mm);
    if (result) {
      void result.then((err) => {
        if (err) input.value = String(threshold);
      });
    }
  }

  const count = task?.waypoints.length ?? 0;
  const progress =
    count > 0 && wpIdx !== null ? `ponto ${Math.min(wpIdx + 1, count)}/${count}` : wpIdx !== null ? `wp ${wpIdx}` : '';
  const previewHint =
    pickedTask && pickedTask.waypoints.length === 0
      ? 'Essa tarefa veio sem os pontos — o mapa não mostra a rota dela.'
      : 'A rota da tarefa escolhida aparece em rosa no mapa.';

  const picker = (label: string, empty: string) => (
    <DrawerField label={label}>
      {assignable.length > 0 ? (
        <select value={pickedId} onChange={(e) => setPicked(e.target.value)}>
          {assignable.map((t) => (
            <option key={t.uuid} value={t.uuid}>
              {t.name} · prioridade {t.priority}
              {t.waypoints.length > 0 ? ` · ${t.waypoints.length} ponto(s)` : ''}
            </option>
          ))}
        </select>
      ) : (
        <DrawerFieldHint>{empty}</DrawerFieldHint>
      )}
    </DrawerField>
  );

  return (
    <>
      <DrawerSubtitle>Tarefa</DrawerSubtitle>
      {hasTask ? (
        <>
          <div className={styles.current}>
            <strong>{task?.name ?? 'tarefa atribuída'}</strong>
            <span>{progress}</span>
          </div>
          {count > 0 && wpIdx !== null && <ProgressBar value={Math.min(wpIdx, count) / count} title="waypoint_idx do último advertisement" />}
          {semiAuto &&
            (onRelease && onSwitch ? (
              <>
                <DrawerActions>
                  <Button variant="outline" onClick={onRelease} title="O robô para onde está e a tarefa volta pra fila (pendente)">
                    Cancelar tarefa
                  </Button>
                </DrawerActions>
                {picker('Trocar por', 'Nenhuma outra tarefa pendente pra trocar.')}
                {assignable.length > 0 && (
                  <>
                    <DrawerHint>
                      A rota da escolhida aparece em rosa. Ao trocar, a atual volta pra fila e o robô segue a nova de onde está.
                    </DrawerHint>
                    <DrawerActions>
                      <Button variant="accent" onClick={() => pickedId && onSwitch(pickedId)}>
                        Trocar tarefa
                      </Button>
                    </DrawerActions>
                  </>
                )}
              </>
            ) : (
              <DrawerHint>Cancelar ou trocar a tarefa no meio não está disponível aqui — o robô segue até concluir.</DrawerHint>
            ))}
        </>
      ) : semiAuto ? (
        <>
          {picker('Escolher tarefa', 'Nenhuma tarefa pendente.')}
          {assignable.length > 0 && (
            <>
              <DrawerHint>{previewHint}</DrawerHint>
              <DrawerActions>
                <Button variant="accent" onClick={() => pickedId && onAssign(pickedId)}>
                  Atribuir
                </Button>
              </DrawerActions>
            </>
          )}
        </>
      ) : (
        <DrawerHint>
          Livre — esperando tarefa da fila ({assignable.length} pendente(s));{' '}
          {nextRunIn !== undefined ? `próxima rodada em ${nextRunIn.toFixed(1)} s.` : `rodada a cada ${ORCHESTRATOR_RUN_S} s.`}
        </DrawerHint>
      )}

      <DrawerRow>
        <DrawerField label="Raio de chegada (mm)">
          <input
            key={threshold}
            type="number"
            min={5}
            step={5}
            defaultValue={threshold}
            onBlur={(e: FocusEvent<HTMLInputElement>) => commitThreshold(e.currentTarget)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && commitThreshold(e.currentTarget)}
            title="waypointsThreshold do robô — vale a partir da próxima tarefa (confirma ao sair do campo ou com Enter)"
          />
        </DrawerField>
      </DrawerRow>
    </>
  );
}
