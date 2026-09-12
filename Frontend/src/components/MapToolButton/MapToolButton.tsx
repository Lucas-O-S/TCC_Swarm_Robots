import type { ButtonHTMLAttributes } from 'react';
import styles from './MapToolButton.module.css';

interface MapToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Marca o botão como "ligado" (ex.: ferramenta ativa). */
  active?: boolean;
}

// Botão pro canto de controles do <MapCanvas>/<MapViewport>, no mesmo
// estilo dos botões de zoom (+/−/⟲) — reutilizável por qualquer tela com
// mapa que precise de uma ferramenta própria (ex.: alternar modo de
// desenhar obstáculo no CenarioBuilder), sem alterar o mapa base.
export function MapToolButton({ active = false, className = '', ...rest }: MapToolButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.button} ${active ? styles.active : ''} ${className}`.trim()}
      aria-pressed={active}
      {...rest}
    />
  );
}
