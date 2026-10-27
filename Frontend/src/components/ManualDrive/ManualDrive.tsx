import { useState } from 'react';
import { DrawerField, DrawerHint } from '../Drawer/DrawerForm';
import { num } from '../Drawer/numInput';
import { Joystick } from '../Joystick/Joystick';
import { PWM_MAX } from '../../Consts/SimulationConsts';
import { joystickToWheels } from './joystickDrive';
import type { DriveCommand } from './joystickDrive';
import styles from './ManualDrive.module.css';

/** Frequência do CMD_MOVE_RAW enquanto arrasta (topo da faixa 10–20 Hz da malha manual). */
const JOYSTICK_HZ = 20;

interface ManualDriveProps {
  /** Velocidade máxima (PWM, 10–127). Fica com quem usa, pra não voltar ao padrão quando a seção some e volta. */
  speed: number;
  onSpeedChange: (speed: number) => void;
  /** PWM das duas rodas (int8): vira CMD_MOVE_RAW. Chamado a JOYSTICK_HZ enquanto arrasta e com (0, 0) ao soltar. */
  onDrive: (left: number, right: number) => void;
}

// Direção manual do robô nos drawers (Simulação e Visualizador): velocidade
// máxima + joystick arcade — frente/ré anda, lados giram (joystickDrive.ts).
export function ManualDrive({ speed, onSpeedChange, onDrive }: ManualDriveProps) {
  const [sending, setSending] = useState<DriveCommand | null>(null);

  function handleJoystick(x: number, y: number) {
    const cmd = joystickToWheels(x, y, speed);
    setSending(x === 0 && y === 0 ? null : cmd);
    onDrive(cmd.left, cmd.right);
  }

  return (
    <>
      <DrawerField
        label={
          <span>
            Joystick (CMD_MOVE_RAW) · velocidade máx. <strong>{speed}</strong>/127
          </span>
        }
      >
        <input type="range" min={10} max={PWM_MAX} value={speed} onChange={num(onSpeedChange)} />
      </DrawerField>
      <Joystick onChange={handleJoystick} rateHz={JOYSTICK_HZ} />
      <p className={styles.readout}>
        {sending ? `enviando L=${sending.left} R=${sending.right}` : 'solto — robô parado'}
      </p>
      <DrawerHint>
        Arraste a bolinha: pra cima anda, pra baixo dá ré, pros lados gira. Enquanto arrasta, manda CMD_MOVE_RAW a
        {JOYSTICK_HZ} Hz; ao soltar, ela volta pro centro e manda a parada.
      </DrawerHint>
    </>
  );
}
