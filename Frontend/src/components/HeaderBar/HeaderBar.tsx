import type { ReactNode } from 'react';
import { Card } from '../Card/Card';
import styles from './HeaderBar.module.css';

/** Aviso curto embaixo do header (erro, confirmação ou só informação). */
export interface Notice {
  kind: 'error' | 'info';
  text: string;
}

interface ChildrenProps {
  children?: ReactNode;
  className?: string;
}

// Header das telas de mapa (Simulação, Visualizador): cartão baixo acima do
// mapa e do menu, com faixas de grupos. Página espelhada: em cada faixa o
// primeiro grupo fica à direita. Cada faixa quebra de linha em tela estreita.
//   <HeaderBar>
//     <HeaderRow>{grupo}{grupo}</HeaderRow>
//     <HeaderRow divided>{grupo}{grupo}</HeaderRow>
//     <HeaderNotice kind="error">…</HeaderNotice>
//   </HeaderBar>
// Os status em linha são <StatusLine inline> (components/StatusLine).
export function HeaderBar({ children, className = '' }: ChildrenProps) {
  return <Card className={`${styles.header} ${className}`.trim()}>{children}</Card>;
}

/** Faixa do header; `divided` separa da de cima com uma linha fina. */
export function HeaderRow({ children, divided = false }: ChildrenProps & { divided?: boolean }) {
  return <div className={`${styles.row} ${divided ? styles.divided : ''}`.trim()}>{children}</div>;
}

/** Grupo de controles/status de uma faixa. */
export function HeaderGroup({ children, className = '' }: ChildrenProps) {
  return <div className={`${styles.group} ${className}`.trim()}>{children}</div>;
}

/** Rótulo em caixa alta (ex.: "Cenário"). */
export function HeaderLabel({ children }: ChildrenProps) {
  return <span className={styles.label}>{children}</span>;
}

/** Aviso embaixo das faixas: erro (vermelho), info (verde) ou muted (esmaecido). */
export function HeaderNotice({ kind, children }: ChildrenProps & { kind: Notice['kind'] | 'muted' }) {
  return <p className={styles[kind]}>{children}</p>;
}
