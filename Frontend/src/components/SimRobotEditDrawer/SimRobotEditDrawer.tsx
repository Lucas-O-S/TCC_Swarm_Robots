import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from '../Drawer/Drawer';
import { Segmented } from '../Segmented/Segmented';
import { DEFAULT_WAYPOINT_THRESHOLD_MM } from '../../Consts/SimulationConsts';
import { DotBotControlMode } from '../../enums/DotBotControlMode.enum';
import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { ScenarioRobotModel } from '../../model/Scenario.Model';
import styles from './SimRobotEditDrawer.module.css';

const MODE_OPTIONS: { value: DotBotControlMode; label: string; title: string }[] = [
  { value: DotBotControlMode.Manual, label: 'Manual', title: 'Obedece CMD_MOVE_RAW (joystick)' },
  { value: DotBotControlMode.Auto, label: 'Auto', title: 'Segue a rota de waypoints (LH2_WAYPOINTS)' },
];

function num(handler: (v: number) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) handler(v);
  };
}

// ---------------------------------------------------------------------------
// Modo Editar — propriedades do robô no estado INICIAL do cenário
// (EditorPanel do RobotSwarmSimulator). Aberto pela seleção do mapa, como o
// ObstacleDrawer do CenarioBuilder — via <MapCanvas panel={...}>.
// ---------------------------------------------------------------------------

interface SimRobotEditDrawerProps {
  robot: ScenarioRobotModel | null;
  label: string;
  onClose: () => void;
  /** Devolve a mensagem de erro, ou null se o address foi aceito. */
  onRename: (next: string) => string | null;
  onPatch: (patch: Partial<ScenarioRobotModel>) => void;
  onStart: (patch: Partial<ScenarioRobotModel['start']>) => void;
  onRemoveWaypoint: (index: number) => void;
  onRemove: () => void;
}

export function SimRobotEditDrawer(props: SimRobotEditDrawerProps) {
  return (
    <Drawer open={props.robot !== null} onClose={props.onClose} title={props.robot ? `Robô ${props.label}` : 'Robô'}>
      {props.robot && <EditRobotForm key={props.robot.address} {...props} robot={props.robot} />}
    </Drawer>
  );
}

function EditRobotForm({ robot, onRename, onPatch, onStart, onRemoveWaypoint, onRemove }: SimRobotEditDrawerProps & { robot: ScenarioRobotModel }) {
  const [address, setAddress] = useState(robot.address);
  const [addressError, setAddressError] = useState<string | null>(null);
  const waypoints = robot.waypoints ?? [];
  const rgb = robot.rgb ?? { r: 0, g: 0, b: 0 };

  function commitAddress() {
    if (address === robot.address) return;
    const error = onRename(address);
    setAddressError(error);
    if (error) setAddress(robot.address);
  }

  return (
    <div className={styles.section}>
      <label className={styles.field}>
        Endereço (16 hex)
        <input
          type="text"
          value={address}
          maxLength={16}
          onChange={(e) => setAddress(e.target.value.toUpperCase())}
          onBlur={commitAddress}
          onKeyDown={(e) => e.key === 'Enter' && commitAddress()}
        />
      </label>
      {addressError && <p className={styles.error}>{addressError}</p>}

      <div className={styles.field}>
        Modo inicial
        <Segmented options={MODE_OPTIONS} value={robot.mode as DotBotControlMode} onChange={(mode) => onPatch({ mode })} />
      </div>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          x (mm)
          <input type="number" step={50} value={Math.round(robot.start.x_mm)} onChange={num((v) => onStart({ x_mm: v }))} />
        </label>
        <label className={styles.field}>
          y (mm)
          <input type="number" step={50} value={Math.round(robot.start.y_mm)} onChange={num((v) => onStart({ y_mm: v }))} />
        </label>
      </div>

      <label className={styles.field}>
        <span>
          Rumo: <strong>{Math.round(robot.start.theta_deg)}°</strong> (0° = leste, 90° = norte)
        </span>
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={((((robot.start.theta_deg + 180) % 360) + 360) % 360) - 180}
          onChange={num((v) => onStart({ theta_deg: v }))}
        />
      </label>

      <label className={styles.field}>
        <span>
          Bateria: <strong>{robot.battery.toFixed(0)}%</strong>
        </span>
        <input type="range" min={0} max={100} step={1} value={robot.battery} onChange={num((v) => onPatch({ battery: v }))} />
      </label>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          LED
          <input
            type="color"
            className={styles.colorInput}
            value={SimRobotMapper.rgbToHex(rgb)}
            onChange={(e) => onPatch({ rgb: SimRobotMapper.hexToRgb(e.target.value) })}
          />
        </label>
        <div className={styles.field}>
          &nbsp;
          <Button variant="outline" onClick={() => onPatch({ rgb: undefined })} disabled={!robot.rgb}>
            Apagar LED
          </Button>
        </div>
      </div>

      <hr className={styles.divider} />
      <p className={styles.subtitle}>Rota (modo Auto)</p>
      <p className={styles.hint}>
        Com o robô selecionado, a ferramenta Waypoint adiciona pontos clicando no mapa (e põe o robô em Auto). Arraste os
        pontos numerados pra ajustar; Backspace apaga o selecionado.
      </p>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          Raio de chegada (mm)
          <input
            type="number"
            min={5}
            step={5}
            value={robot.waypoint_threshold_mm ?? DEFAULT_WAYPOINT_THRESHOLD_MM}
            onChange={num((v) => v > 0 && onPatch({ waypoint_threshold_mm: v }))}
          />
        </label>
        <label className={styles.checkbox} style={{ alignSelf: 'flex-end', paddingBottom: 8 }}>
          <input type="checkbox" checked={robot.loop ?? false} onChange={(e) => onPatch({ loop: e.target.checked })} />
          Loop
        </label>
      </div>

      {waypoints.length > 0 ? (
        <ul className={styles.pointList}>
          {waypoints.map((wp, i) => (
            <li key={i}>
              <span>
                {i + 1}. x={Math.round(wp.x_mm)} y={Math.round(wp.y_mm)}
              </span>
              <button type="button" className={styles.iconButton} onClick={() => onRemoveWaypoint(i)} aria-label={`Remover ponto ${i + 1}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.hint}>Sem rota.</p>
      )}

      <div className={styles.actions}>
        <Button variant="outline" onClick={() => onPatch({ waypoints: [] })} disabled={waypoints.length === 0}>
          Limpar rota
        </Button>
        <Button variant="solid" onClick={onRemove}>
          Remover robô
        </Button>
      </div>
    </div>
  );
}
