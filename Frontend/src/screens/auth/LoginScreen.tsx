import { BeeLogo } from './components/BeeLogo';
import { LoginForm } from './components/LoginForm';
import styles from './LoginScreen.module.css';

export function LoginScreen() {
  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        <BeeLogo />
        <LoginForm />
        <a href="#" className={styles.helpLink}>
          Estou com problemas
        </a>
      </div>
    </div>
  );
}
