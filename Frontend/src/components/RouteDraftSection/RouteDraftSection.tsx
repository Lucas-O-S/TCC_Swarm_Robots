import { Button } from '../Button/Button';
import { DrawerActions, DrawerField, DrawerFieldHint, DrawerHint, DrawerRow } from '../Drawer/DrawerForm';
import { num } from '../Drawer/numInput';

interface RouteDraftSectionProps {
  /** Pontos montados no mapa com a ferramenta Waypoint. */
  draftCount: number;
  /** Raio de chegada da rota (mm). Fica com quem usa, pra não voltar ao padrão quando a seção some e volta. */
  threshold: number;
  onThresholdChange: (mm: number) => void;
  onSend: () => void;
  onClear: () => void;
  onResend: () => void;
  /** Existe rota pra reenviar. */
  canResend: boolean;
  resendLabel?: string;
  resendTitle?: string;
}

// Rota avulsa do modo Manual nos drawers de robô (Simulação e Visualizador):
// os pontos são montados no mapa e descem como LH2_WAYPOINTS.
export function RouteDraftSection({
  draftCount,
  threshold,
  onThresholdChange,
  onSend,
  onClear,
  onResend,
  canResend,
  resendLabel = 'Reenviar atual',
  resendTitle = 'Reenvia a rota atual do robô (volta ao ponto 1)',
}: RouteDraftSectionProps) {
  return (
    <>
      <DrawerField as="div" label="Rota avulsa (LH2_WAYPOINTS)">
        <DrawerFieldHint>
          {draftCount > 0
            ? `${draftCount} ponto(s) montado(s) — laranja no mapa.`
            : 'Ligue a ferramenta Waypoint no mapa e clique pra montar a rota deste robô.'}
        </DrawerFieldHint>
      </DrawerField>
      <DrawerRow>
        <DrawerField label="Raio (mm)">
          <input type="number" min={5} step={5} value={threshold} onChange={num((v) => v > 0 && onThresholdChange(v))} />
        </DrawerField>
      </DrawerRow>
      <DrawerActions>
        <Button variant="accent" onClick={onSend} disabled={draftCount === 0}>
          Enviar rota
        </Button>
        <Button variant="outline" onClick={onClear} disabled={draftCount === 0}>
          Limpar
        </Button>
        <Button variant="outline" onClick={onResend} disabled={!canResend} title={resendTitle}>
          {resendLabel}
        </Button>
      </DrawerActions>
      <DrawerHint>O robô segue a rota sozinho (entra em AUTO no fio) até você mexer no joystick de novo.</DrawerHint>
    </>
  );
}
