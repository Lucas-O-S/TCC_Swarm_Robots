import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// "Controller" da tela de login: guarda o estado dos campos e trata o submit.
// Quando o backend existir de verdade, o handleSubmit chamará o authService
// (POST /auth/login) e guardará o JWT retornado.
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
    try {
      // TODO: integrar com authService.login({ username, password }) assim
      // que a rota POST /auth/login estiver ligada no AUTH_ACTIVATED=true.
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return { username, setUsername, password, setPassword, handleSubmit, error, loading };
}
