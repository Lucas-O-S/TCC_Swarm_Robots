import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './MapMenuLayout.module.css';

// Espaço reservado abaixo do mapa (bate com o padding-bottom de .screen) pra
// ele não colar na borda inferior da tela.
const SCREEN_BOTTOM_GAP = 28;

interface MapMenuLayoutProps {
  menu: ReactNode;
  /** Faixa opcional no topo, acima do mapa e do menu (ex.: header da Simulação). */
  header?: ReactNode;
  /** Conteúdo do mapa — recebe a altura máxima calculada (px) pra caber na tela sem rolagem. */
  children: (maxMapHeight: number | undefined) => ReactNode;
  /** Mapa acompanha a rolagem da página (menu mais comprido que a tela, ex.: Simulação). Só com duas colunas. */
  stickyMap?: boolean;
  className?: string;
}

// Layout de duas colunas (mapa + menu lateral) reutilizado pelas telas que
// combinam um <MapCanvas> com um painel de configuração/controle ao lado
// (ex.: CenarioBuilder). Mede a altura disponível da coluna do mapa e
// repassa pro conteúdo, pra ele preencher a tela sem estourar o rodapé.
// Com `header`, a faixa fica em cima das duas colunas; se ela mudar de
// altura (quebra de linha, aviso aparecendo), a altura do mapa é recalculada.
export function MapMenuLayout({ menu, header, children, stickyMap = false, className = '' }: MapMenuLayoutProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [maxMapHeight, setMaxMapHeight] = useState<number>();
  const hasHeader = header !== undefined && header !== null;

  useEffect(() => {
    function updateMaxHeight() {
      if (!bodyRef.current) return;
      // Posição na PÁGINA (não na janela): recalcular com a página rolada (ex.:
      // um drawer abrindo e empurrando o conteúdo) não pode mudar a altura.
      // Mede o topo do corpo, não o da coluna do mapa: com `stickyMap`, a coluna
      // rolada fica grudada no alto da janela e não está mais no lugar dela.
      const top = bodyRef.current.getBoundingClientRect().top + window.scrollY;
      setMaxMapHeight(Math.max(0, window.innerHeight - top - SCREEN_BOTTOM_GAP));
    }

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    const observer = headerRef.current && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateMaxHeight) : null;
    if (observer && headerRef.current) observer.observe(headerRef.current);
    return () => {
      window.removeEventListener('resize', updateMaxHeight);
      observer?.disconnect();
    };
  }, [hasHeader]);

  return (
    <div className={`${styles.screen} ${className}`}>
      {hasHeader && (
        <div className={styles.header} ref={headerRef}>
          {header}
        </div>
      )}
      <div className={styles.body} ref={bodyRef}>
        <div className={`${styles.mapColumn} ${stickyMap ? styles.sticky : ''}`}>
          {children(maxMapHeight)}
        </div>

        {menu}
      </div>
    </div>
  );
}
