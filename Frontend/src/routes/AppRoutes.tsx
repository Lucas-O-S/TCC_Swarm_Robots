import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TasksScreen } from '../screens/tasks/TasksScreen';
import { RobotsScreen } from '../screens/robots/RobotsScreen';
import { SimulationScreen } from '../simulator/ui/SimulationScreen';
import { AppLayout } from '../components/Layout/AppLayout';

// Mapa de rotas do app. /login fica fora da casca de navegação; todas as
// telas autenticadas são filhas de <AppLayout /> (barra MARI + menu + Sair).
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginScreen />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/tarefas" element={<TasksScreen />} />
          <Route path="/robos" element={<RobotsScreen />} />
          <Route path="/simulacao" element={<SimulationScreen />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
