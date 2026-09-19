import type { ButtonHTMLAttributes } from 'react';
import styles from './MapToolButton.module.css';

export type MapToolButtonVariant = 'tool' | 'click';

interface MapToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 'tool' (padrão): alterna e fica "aceso" (fundo laranja) enquanto
   * `active` for true — ex.: Mover/Selecionar/Obstáculo.
   * 'click': ação de disparo único, sem estado — só escurece no instante
   * do clique (feedback), sem ficar marcado depois — ex.: zoom, reset.
   */
  variant?: MapToolButtonVariant;
  /** Só tem efeito com variant="tool". Marca o botão como "ligado". */
  active?: boolean;
}

// Botão pro canto de controles do <MapCanvas>/<MapViewport>, no mesmo
// estilo dos botões de zoom (+/−/⟲) — reutilizável por qualquer tela com
// mapa que precise de uma ferramenta própria (ex.: alternar modo de
// desenhar obstáculo no CenarioBuilder), sem alterar o mapa base.
export function MapToolButton({
  variant = 'tool',
  active = false,
  className = '',
  ...rest
}: MapToolButtonProps) {
  const toggledOn = variant === 'tool' && active;
  return (
    <button
      type="button"
      className={`${styles.button} ${toggledOn ? styles.active : ''} ${className}`.trim()}
      aria-pressed={variant === 'tool' ? active : undefined}
      {...rest}
    />
  );
}
