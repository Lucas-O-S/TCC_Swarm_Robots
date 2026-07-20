import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// "Controller" da tela de login: guarda o estado dos campos e trata o submit.
// Quando o backend existir, o handleSubmit chamará o authService.
export function useLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // TODO: integrar com authService.login({ username, password })
    navigate('/dashboard');
  }

  return { username, setUsername, password, setPassword, handleSubmit };
}
