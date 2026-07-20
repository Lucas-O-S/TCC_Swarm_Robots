import styles from './StatusHex.module.css';

interface StatusHexProps {
  online: boolean;
}

// Hexágono de status: verde (online, pisca) ou vermelho (offline).
export function StatusHex({ online }: StatusHexProps) {
  return (
    <svg
      className={`${styles.hex} ${online ? styles.blink : ''}`}
      viewBox="0 0 24 24"
    >
      <polygon
        points="12,2 21,7 21,17 12,22 3,17 3,7"
        fill={online ? 'var(--color-green)' : 'var(--color-red)'}
      />
    </svg>
  );
}
