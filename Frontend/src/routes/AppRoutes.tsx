import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { RobotsScreen } from '../screens/robots/RobotsScreen';

// Mapa de rotas do app. Cada tela existente tem uma URL.
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/dashboard" element={<DashboardScreen />} />
        <Route path="/tarefas" element={<TasksScreen />} />
        <Route path="/robos" element={<RobotsScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
