import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/Layout/AppLayout';

// Cada tela vira um chunk JS separado, baixado só quando a rota é
// visitada — em vez de tudo (Dashboard + Robôs + Tarefas + Simulação,
// que carrega a lib `mqtt` inteira) ir junto no bundle principal que
// carrega logo no /login. Resolve o aviso do `vite build` sobre o chunk
// final passar de 500kB.
const LoginScreen = lazy(() =>
  import('../screens/auth/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const DashboardScreen = lazy(() =>
  import('../screens/dashboard/DashboardScreen').then((m) => ({ default: m.DashboardScreen })),
);
const TasksScreen = lazy(() =>
  import('../screens/tasks/TasksScreen').then((m) => ({ default: m.TasksScreen })),
);
const RobotsScreen = lazy(() =>
  import('../screens/robots/RobotsScreen').then((m) => ({ default: m.RobotsScreen })),
);
const SimulationScreen = lazy(() =>
  import('../screens/simulator/ui/SimulationScreen').then((m) => ({ default: m.SimulationScreen })),
);

// Mapa de rotas do app. /login fica fora da casca de navegação; todas as
// telas autenticadas são filhas de <AppLayout /> (barra MARI + menu + Sair).
// `AppLayout` continua importado direto (é pequeno e precisa estar pronto
// assim que qualquer rota autenticada renderiza); só as telas de fato
// (pesadas, principalmente Simulação por causa do `mqtt`) são lazy.
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
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
      </Suspense>
    </BrowserRouter>
  );
}
