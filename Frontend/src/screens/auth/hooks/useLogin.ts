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
    try {
      const result = await AuthService.login({ username: username.trim(), password });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return { username, setUsername, password, setPassword, handleSubmit, error, loading };
}