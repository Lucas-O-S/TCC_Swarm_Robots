import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'solid' | 'outline' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

// Botão de ação laranja (Deploy, Simular...).
//
// BUG PRÉ-EXISTENTE CORRIGIDO: todo o app já chamava `<Button variant="...">`
// (Dashboard, Tarefas, Robôs, Simulação), mas `ButtonProps` nunca declarava
// essa prop — `tsc -b` rejeitava todos esses usos (`Property 'variant' does
// not exist`). `variant` também vazava pro elemento <button> nativo via
// `...rest` (atributo HTML inválido). Corrigido aqui: `variant` agora é
// tipado e vira uma classe CSS (`styles[variant]`); como `Button.module.css`
// só tinha `.button` até agora, os variantes ficam visualmente iguais até
// alguém desenhar `.solid`/`.outline`/`.accent` nesse arquivo — isso é uma
// decisão de design, não mexi nela.
export function Button({ children, className = '', variant, ...rest }: ButtonProps) {
  const variantClass = variant ? styles[variant] || '' : '';
  return (
    <button className={`${styles.button} ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
