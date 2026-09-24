import type { LinkLogEntry } from '../../Integration/LocalFleetLink';
import styles from './GatewayLog.module.css';

interface GatewayLogProps {
  entries: readonly LinkLogEntry[];
}

// Log do ciclo de vida da rede — o que o gateway simulado fez (gw) e o que
// o backend local viu/mandou (api): NODE_JOINED/LEFT, comandos aplicados ou
// perdidos, mudanças de status por timeout, swarmit. Advertise e keep-alive
// não entram (seriam dezenas por segundo) — só os contadores no cartão Rede;
// o fluxo do joystick vira uma linha só, com o contador de repetições (×N).
// Mesmo papel do ConnectionLog do Dashboard, com timestamp do tempo simulado.
export function GatewayLog({ entries }: GatewayLogProps) {
  if (entries.length === 0) return <p className={styles.hint}>Sem eventos ainda.</p>;

  return (
    <ul className={styles.log}>
      {entries.map((e) => (
        <li key={e.id}>
          <span className={styles.logTime}>{e.t.toFixed(1)}s</span>
          <span className={styles.logSource}>{e.source === 'gateway' ? 'gw' : 'api'}</span>
          <span>
            {e.text}
            {e.count > 1 && <span className={styles.logCount}> ×{e.count}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
