import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './MapMenuLayout.module.css';

// Espaço reservado abaixo do mapa (bate com o padding-bottom de .screen) pra
// ele não colar na borda inferior da tela.
const SCREEN_BOTTOM_GAP = 28;

interface MapMenuLayoutProps {
  menu: ReactNode;
  /** Conteúdo do mapa — recebe a altura máxima calculada (px) pra caber na tela sem rolagem. */
  children: (maxMapHeight: number | undefined) => ReactNode;
  className?: string;
}

// Layout de duas colunas (mapa + menu lateral) reutilizado pelas telas que
// combinam um <MapCanvas> com um painel de configuração/controle ao lado
// (ex.: CenarioBuilder). Mede a altura disponível da coluna do mapa e
// repassa pro conteúdo, pra ele preencher a tela sem estourar o rodapé.
export function MapMenuLayout({ menu, children, className = '' }: MapMenuLayoutProps) {
  const mapColumnRef = useRef<HTMLDivElement>(null);
  const [maxMapHeight, setMaxMapHeight] = useState<number>();

  useEffect(() => {
    function updateMaxHeight() {
      if (!mapColumnRef.current) return;
      const top = mapColumnRef.current.getBoundingClientRect().top;
      setMaxMapHeight(Math.max(0, window.innerHeight - top - SCREEN_BOTTOM_GAP));
    }

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, []);

  return (
    <div className={`${styles.screen} ${className}`}>
      <div className={styles.body}>
        <div className={styles.mapColumn} ref={mapColumnRef}>
          {children(maxMapHeight)}
        </div>

        {menu}
      </div>
    </div>
  );
}
