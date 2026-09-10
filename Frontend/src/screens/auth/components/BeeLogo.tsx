import styles from './BeeLogo.module.css';

// Título M.A.R.I. + ícone da abelha (SVG inline — sem depender de asset
// binário externo, então o componente não quebra se o arquivo de imagem
// não estiver disponível no ambiente).
export function BeeLogo() {
  return (
    <>
      <h1 className={styles.logoText}>M A R I</h1>
      <div className={styles.beeArea}>
        <svg viewBox="0 0 64 64" role="img" aria-label="Abelha">
          <path
            d="M32 4 55 17 55 43 32 56 9 43 9 17Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <ellipse cx="32" cy="34" rx="11" ry="14" fill="currentColor" />
          <rect x="21" y="26" width="22" height="4" fill="var(--color-bg-login)" />
          <rect x="21" y="34" width="22" height="4" fill="var(--color-bg-login)" />
          <circle cx="32" cy="17" r="6" fill="currentColor" />
          <path d="M20 14 14 6M44 14 50 6" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </>
  );
}
