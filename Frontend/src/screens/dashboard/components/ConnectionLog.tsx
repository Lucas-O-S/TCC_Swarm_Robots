import type { ConnectionLogEntry } from '../types';
import styles from './ConnectionLog.module.css';

interface ConnectionLogProps {
  entries: ConnectionLogEntry[];
}

// Linha(s) de log de desconexão, no rodapé do mapa (ver captura de tela de
// referência). Deliberadamente simples: sem card, sem timestamp — é só o
// aviso mais recente.
export function ConnectionLog({ entries }: ConnectionLogProps) {
  if (entries.length === 0) return null;

  return (
    <ul className={styles.log}>
      {entries.map((entry) => (
        <li key={entry.id}>{entry.message}</li>
      ))}
    </ul>
  );
}
