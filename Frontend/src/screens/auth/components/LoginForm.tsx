import { useLogin } from '../hooks/useLogin';
import styles from './LoginForm.module.css';

// Moldura hexagonal laranja com os campos de usuário/senha.
export function LoginForm() {
  const { username, setUsername, password, setPassword, handleSubmit, error, loading } =
    useLogin();

  return (
    <div className={styles.loginWrapper}>
      <svg viewBox="0 0 400 320" className={styles.hexSvg}>
        <path d="M120 20 Q135 0 160 0 H240 Q265 0 280 20 L360 120 Q380 140 380 160 Q380 180 360 200 L280 300 Q265 320 240 320 H160 Q135 320 120 300 L40 200 Q20 180 20 160 Q20 140 40 120 Z" />
      </svg>

      <form className={styles.loginBox} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <span className={styles.error}>{error}</span>}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Confirmar'}
        </button>
      </form>
    </div>
  );
}
