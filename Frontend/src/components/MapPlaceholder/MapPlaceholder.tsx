import styles from './MapPlaceholder.module.css';

// Lugar do mapa antes de escolher o cenário (Simulação, Visualizador): caixa
// tracejada da altura que o mapa vai ocupar, pra tela não pular depois.
export function MapPlaceholder({ height }: { height?: number }) {
  return <div className={styles.placeholder} style={{ height }} />;
}
