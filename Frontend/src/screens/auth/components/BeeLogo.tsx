import beeIcon from '../../../assets/iconeabelinha.png';
import styles from './BeeLogo.module.css';

// Título M.A.R.I. + ícone da abelha.
export function BeeLogo() {
  return (
    <>
      <h1 className={styles.logoText}>M.A.R.I.</h1>
      <div className={styles.beeArea}>
        <img src={beeIcon} alt="Abelha" />
      </div>
    </>
  );
}
