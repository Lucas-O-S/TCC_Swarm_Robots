import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_EXPECTED_HZ, NET_WINDOWS_MS } from '../VisNetStats';
import type { VisNetStats } from '../VisNetStats';

// Janela e taxa esperada do cartão Rede + a fotografia dos números
// (VisNetStats.snapshot), refeita no relógio de 1 s da tela — não a cada
// quadro, que com muitos robôs seria caro. O drawer do robô usa a mesma
// fotografia, então os dois sempre batem.
export function useNetStats(net: VisNetStats, now: number) {
  const [windowMs, setWindowMs] = useState<number>(NET_WINDOWS_MS[0]);
  const [expectedHz, setExpectedHz] = useState(DEFAULT_EXPECTED_HZ);
  /** Hora do último Zerar: refaz a fotografia na hora, sem esperar o próximo tique do relógio. */
  const [clearedAt, setClearedAt] = useState(0);

  const at = Math.max(now, clearedAt);
  const snapshot = useMemo(() => net.snapshot(at, windowMs, expectedHz), [net, at, windowMs, expectedHz]);

  const reset = useCallback(() => {
    net.resetCounters();
    setClearedAt(Date.now());
  }, [net]);

  return { snapshot, windowMs, setWindowMs, expectedHz, setExpectedHz, reset };
}
