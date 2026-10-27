import { DrawerField, DrawerFieldHint, DrawerHint } from '../Drawer/DrawerForm';
import { Segmented } from '../Segmented/Segmented';
import { RobotControlMode } from '../../enums/RobotControlMode.enum';
import { ORCHESTRATOR_RUN_S } from '../../Integration/LocalOrchestrator';

// Modos de ORQUESTRAÇÃO do backend (RobotControlMode), não o modo do fio.
const MODE_OPTIONS: { value: RobotControlMode; label: string; title: string }[] = [
  { value: RobotControlMode.Manual, label: 'Manual', title: 'Dirigido no joystick (CMD_MOVE_RAW); o orquestrador não mexe' },
  { value: RobotControlMode.SemiAuto, label: 'Semi-auto', title: 'Executa tarefas sozinho, mas só as que você atribui' },
  { value: RobotControlMode.Auto, label: 'Auto', title: `Pega sozinho a próxima tarefa da fila (rodada a cada ${ORCHESTRATOR_RUN_S} s)` },
];

const MODE_HINT: Record<RobotControlMode, string> = {
  [RobotControlMode.Manual]: 'Você dirige: joystick ou uma rota avulsa (LH2_WAYPOINTS) — o orquestrador não mexe neste robô.',
  [RobotControlMode.SemiAuto]:
    'Executa tarefas sozinho (segue os waypoints), mas só recebe tarefa atribuída por você — fica fora da fila do orquestrador.',
  [RobotControlMode.Auto]: `Entra na fila: a cada ${ORCHESTRATOR_RUN_S} s o orquestrador dá a próxima tarefa pendente (menor prioridade primeiro) a um robô Auto livre.`,
};

interface RobotModeFieldProps {
  /** null = o robô ainda não está cadastrado: mostra `pendingText` no lugar do seletor. */
  value: RobotControlMode | null;
  onChange: (mode: RobotControlMode) => void;
  pendingText?: string;
}

// Campo "Modo" dos drawers de robô (Simulação e Visualizador): seletor
// Manual/Semi-auto/Auto + a explicação do modo escolhido.
export function RobotModeField({ value, onChange, pendingText }: RobotModeFieldProps) {
  return (
    <>
      <DrawerField as="div" label="Modo">
        {value !== null ? (
          <Segmented options={MODE_OPTIONS} value={value} onChange={onChange} ariaLabel="Modo de controle" />
        ) : (
          <DrawerFieldHint>{pendingText}</DrawerFieldHint>
        )}
      </DrawerField>
      {value !== null && <DrawerHint>{MODE_HINT[value]}</DrawerHint>}
    </>
  );
}
