import styles from './Segmented.module.css';

interface SegmentedProps<T extends string | number> {
  options: { value: T; label: string; title?: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

// Grupo exclusivo de botões (Editar/Simular, Manual/Auto) — mesmo desenho do
// seletor segmentado do AreaDrawer, com o "ligado" em laranja como as
// ferramentas do mapa.
export function Segmented<T extends string | number>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`${styles.segButton} ${o.value === value ? styles.segActive : ''}`}
          aria-pressed={o.value === value}
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
