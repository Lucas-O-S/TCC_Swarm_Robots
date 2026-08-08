import styles from './HexBackground.module.css';

// Hexágonos decorativos ao fundo do dashboard.
export function HexBackground() {
  return (
    <div className={styles.hexBackground}>
      <div className={`${styles.hexGroup} ${styles.leftTop}`}>
        <div className={styles.hex} />
        <div className={`${styles.hex} ${styles.light}`} />
        <div className={styles.hex} />
        <div className={`${styles.hex} ${styles.empty}`} />
        <div className={`${styles.hex} ${styles.light}`} />
      </div>

      <div className={`${styles.hexGroup} ${styles.rightTop}`}>
        <div className={styles.hex} />
        <div className={styles.hex} />
        <div className={`${styles.hex} ${styles.light}`} />
        <div className={styles.hex} />
        <div className={`${styles.hex} ${styles.empty}`} />
        <div className={`${styles.hex} ${styles.light}`} />
      </div>

      <div className={`${styles.hexGroup} ${styles.centerSoft}`}>
        <div className={`${styles.hex} ${styles.small} ${styles.light}`} />
        <div className={`${styles.hex} ${styles.small} ${styles.empty}`} />
      </div>
    </div>
  );
}
