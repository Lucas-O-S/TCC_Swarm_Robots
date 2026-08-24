import styles from './StatusHex.module.css';

interface StatusHexProps {
  online: boolean;
}

// Indicador de conexão (bolinha verde/laranja) usado na lista de robôs do
// dashboard. O nome vem do desenho original (um hexágono), mas hoje é
// renderizado como um ponto simples — mantido como componente à parte para
// trocar o desenho num único lugar caso o visual mude.
export function StatusHex({ online }: StatusHexProps) {
  return (
    <span
      className={`${styles.dot} ${online ? styles.online : styles.offline}`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
