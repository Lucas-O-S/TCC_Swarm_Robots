import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../../../services/Auth.Service';

// "Controller" da tela de login: guarda o estado dos campos e trata o submit.
// O handleSubmit chama o AuthService (POST /auth/login), que guarda o JWT.
export function useLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Preencha usuário e senha.');
      return;
    }

    setLoading(true);
    // Log de debug do login (timeout com o servidor): URL, tempo e resultado.
    const url = `${import.meta.env.VITE_API_URL}/auth/login`;
    const startedAt = performance.now();
    console.log('[login] POST', url, { username: username.trim() });
    try {
      const result = await AuthService.login({ username: username.trim(), password });
      const elapsedMs = Math.round(performance.now() - startedAt);
      if (!result.ok) {
        console.error('[login] falhou', { url, elapsedMs, kind: result.kind, status: result.status, message: result.message });
        setError(result.message);
        return;
      }
      console.log('[login] ok', { url, elapsedMs });
      // /dashboard está sem rota (dev-front, 2026-10-05): a tela inicial agora é a Simulação.
      navigate('/simulacao');
    } finally {
      setLoading(false);
    }
  }

  return { username, setUsername, password, setPassword, handleSubmit, error, loading };
}