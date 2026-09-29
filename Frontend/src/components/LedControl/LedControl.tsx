import { useState } from 'react';
import { Button } from '../Button/Button';
import { ColorInput } from '../ColorInput/ColorInput';
import { DrawerActions, DrawerField, DrawerRow } from '../Drawer/DrawerForm';
import type { RgbColorModel } from '../../model/SimRobot.Model';

/** Cor inicial do seletor quando o LED está apagado. */
const DEFAULT_COLOR: RgbColorModel = { r: 255, g: 140, b: 0 };

interface LedControlProps {
  /** Cor atual do LED, se souber (apagado/desconhecido = começa no laranja). */
  value: RgbColorModel | null;
  onApply: (color: RgbColorModel) => void;
}

// LED do robô nos drawers (Simulação e Visualizador): escolhe a cor e manda
// CMD_RGB_LED (Acender) ou 0,0,0 (Apagar).
export function LedControl({ value, onApply }: LedControlProps) {
  const [color, setColor] = useState<RgbColorModel>(() => (value && (value.r || value.g || value.b) ? value : DEFAULT_COLOR));

  return (
    <DrawerRow>
      <DrawerField label="LED (CMD_RGB_LED)">
        <ColorInput value={color} onChange={setColor} />
      </DrawerField>
      <DrawerField as="div" label={' '}>
        <DrawerActions>
          <Button variant="outline" onClick={() => onApply(color)}>
            Acender
          </Button>
          <Button variant="outline" onClick={() => onApply({ r: 0, g: 0, b: 0 })}>
            Apagar
          </Button>
        </DrawerActions>
      </DrawerField>
    </DrawerRow>
  );
}
