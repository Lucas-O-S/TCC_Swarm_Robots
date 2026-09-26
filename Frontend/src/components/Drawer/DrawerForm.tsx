import type { ReactNode } from 'react';
import styles from './DrawerForm.module.css';

// Peças de conteúdo dos drawers — a mesma estrutura em todas as telas
// (Simulação, Construtor de Cenários, Tarefas), com a aparência dos drawers
// da Simulação. Cada drawer monta o formulário com elas dentro do <Drawer>:
//   <DrawerBody>
//     <DrawerField label="Nome"><input /></DrawerField>
//     <DrawerRow>{dois DrawerField lado a lado}</DrawerRow>
//     <DrawerHint>…</DrawerHint>
//     <DrawerSection title="Comandos" />
//     <DrawerActions>{botões}</DrawerActions>
//   </DrawerBody>

interface ChildrenProps {
  children?: ReactNode;
  className?: string;
}

/** Coluna com o espaçamento padrão entre os itens do drawer. */
export function DrawerBody({ children, className = '' }: ChildrenProps) {
  return <div className={`${styles.body} ${className}`.trim()}>{children}</div>;
}

interface DrawerFieldProps extends ChildrenProps {
  /** Texto (ou nó) do rótulo, acima do controle. */
  label?: ReactNode;
  /** "label" (default) liga o rótulo ao input de dentro; "div" pra grupos (ex.: seletor segmentado, vários botões). */
  as?: 'label' | 'div';
  title?: string;
}

/** Rótulo + controle em coluna (input, select, textarea, range, seletor…). */
export function DrawerField({ label, children, as = 'label', title, className = '' }: DrawerFieldProps) {
  const Tag = as;
  return (
    <Tag className={`${styles.field} ${className}`.trim()} title={title}>
      {label}
      {children}
    </Tag>
  );
}

/** Campos lado a lado, dividindo a largura. */
export function DrawerRow({ children, className = '' }: ChildrenProps) {
  return <div className={`${styles.row} ${className}`.trim()}>{children}</div>;
}

/** Texto de apoio/resumo, pequeno e esmaecido. */
export function DrawerHint({ children, className = '' }: ChildrenProps) {
  return <p className={`${styles.hint} ${className}`.trim()}>{children}</p>;
}

/** Mensagem de erro. */
export function DrawerError({ children }: ChildrenProps) {
  return <p className={styles.error}>{children}</p>;
}

/** Fileira de botões (quebra de linha quando não cabe). */
export function DrawerActions({ children, className = '' }: ChildrenProps) {
  return <div className={`${styles.actions} ${className}`.trim()}>{children}</div>;
}

/** Linha divisória entre partes do drawer. */
export function DrawerDivider() {
  return <hr className={styles.divider} />;
}

/** Título de seção em caixa alta (sem divisória). */
export function DrawerSubtitle({ children }: ChildrenProps) {
  return <p className={styles.subtitle}>{children}</p>;
}

/** Divisória + título de seção em caixa alta. */
export function DrawerSection({ title }: { title: string }) {
  return (
    <>
      <DrawerDivider />
      <DrawerSubtitle>{title}</DrawerSubtitle>
    </>
  );
}
