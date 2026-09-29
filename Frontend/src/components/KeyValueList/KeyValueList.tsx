import { Fragment } from 'react';
import type { ReactNode } from 'react';
import styles from './KeyValueList.module.css';

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

// Lista chave → valor em fonte mono, com o valor à direita — a telemetria
// dos drawers de robô (Simulação e Visualizador).
export function KeyValueList({ items }: { items: KeyValueItem[] }) {
  return (
    <dl className={styles.kv}>
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
