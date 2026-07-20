import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

// Botão de ação laranja (Deploy, Simular...).
export function Button({ children, className = '', ...rest }: ButtonProps) {
  return (
    <button className={`${styles.button} ${className}`} {...rest}>
      {children}
    </button>
  );
}
