import { SimRobotMapper } from '../../mapper/SimRobot.Mapper';
import type { RgbColorModel } from '../../model/SimRobot.Model';
import styles from './ColorInput.module.css';

interface ColorInputProps {
  value: RgbColorModel;
  onChange: (color: RgbColorModel) => void;
  title?: string;
}

// Seletor de cor do LED (CMD_RGB_LED) — o <input type="color"> quadradinho
// dos drawers de robô, já convertendo "#rrggbb" ⇄ r/g/b.
export function ColorInput({ value, onChange, title }: ColorInputProps) {
  return (
    <input
      type="color"
      className={styles.input}
      value={SimRobotMapper.rgbToHex(value)}
      onChange={(e) => onChange(SimRobotMapper.hexToRgb(e.target.value))}
      title={title}
    />
  );
}
