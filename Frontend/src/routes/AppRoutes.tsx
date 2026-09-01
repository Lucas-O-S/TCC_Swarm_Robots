import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/Layout/AppLayout';

// Cada tela vira um chunk JS separado, baixado só quando a rota é
// visitada — evita carregar tudo (inclusive a lib `mqtt`, que só a tela
// de Simulação usa) junto no bundle principal que carrega no /login.
const LoginScreen = lazy(() =>
  import('../screens/auth/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const DashboardScreen = lazy(() =>
  import('../screens/dashboard/DashboardScreen').then((m) => ({ default: m.DashboardScreen })),
);
const SimulationScreen = lazy(() =>
  import('../screens/simulator/ui/SimulationScreen').then((m) => ({ default: m.SimulationScreen })),
);

// Mapa de rotas do app. /login fica fora da casca de navegação; todas as
// telas autenticadas são filhas de <AppLayout /> (barra MARI + menu + Sair).
//
// /robos e /tarefas removidas a pedido (2026-09-01): só a estrutura de
// integração com o backend (src/dto, src/model, src/mapper,
// src/services/{RobotService,TaskService}) deveria existir nesta rodada,
// sem telas ainda — ver STATUS.md.
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />

          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/simulacao" element={<SimulationScreen />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
