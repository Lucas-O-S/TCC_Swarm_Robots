import { Navigate, Outlet } from 'react-router-dom';
import { AuthTokenStorage } from '../services/AuthTokenStorage';

// Guarda de rotas: sem token guardado, manda para /login. (A validade real
// do token é checada pela API: um 401 dispara o logout automático, ver
// `AuthService.init` em main.tsx.)
export function RequireAuth() {
  return AuthTokenStorage.get() ? <Outlet /> : <Navigate to="/login" replace />;
}