import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'solid' | 'accent' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * solid   -> fundo escuro, texto claro (ação principal: Simular, Confirmar)
   * accent  -> fundo laranja (ação de destaque: Deploy, Replay)
   * outline -> contorno vermelho (ação secundária/destrutiva: Cancelar, Reconectar)
   */
  variant?: ButtonVariant;
}

// Botão único do design system do MARI. Centraliza os 3 estilos vistos nas
// telas de referência em vez de cada tela reimplementar seu próprio botão.
export function Button({ variant = 'solid', className = '', ...rest }: ButtonProps) {
  return <button className={`${styles.button} ${styles[variant]} ${className}`} {...rest} />;
}
