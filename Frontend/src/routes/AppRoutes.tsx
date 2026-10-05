import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/Layout/AppLayout';
import { CenarioBuilder } from '../screens/CenarioBuilder/CenarioBuilder';

// Cada tela vira um chunk JS separado, baixado só quando a rota é
// visitada — evita carregar tudo (inclusive a lib `mqtt`, que só a tela
// de Simulação usa) junto no bundle principal que carrega no /login.
const LoginScreen = lazy(() =>
  import('../screens/auth/LoginScreen').then((m) => ({ default: m.LoginScreen })),
);
const Simulation = lazy(() =>
  import('../screens/Simulation/Simulation').then((m) => ({ default: m.Simulation })),
);
const Visualizer = lazy(() =>
  import('../screens/Visualizer/Visualizer').then((m) => ({ default: m.Visualizer })),
);
const TaskBuilder = lazy(() =>
  import('../screens/TaskBuilder/TaskBuilder').then((m) => ({ default: m.TaskBuilder })),
);

// Mapa de rotas do app. /login fica fora da casca de navegação; todas as
// telas autenticadas são filhas de <AppLayout /> (barra MARI + menu + Sair).
//
// /robos removida a pedido (2026-09-01): só a estrutura de integração com o
// backend (src/dto, src/model, src/mapper, src/services/RobotService)
// deveria existir nesta rodada, sem tela ainda. /tarefas voltou como
// TaskBuilder (mesmo padrão do CenarioBuilder, ver src/screens/TaskBuilder).
//
// /dashboard e /mapa-teste sem acesso a pedido (2026-10-05): as telas
// continuam em src/screens (dashboard, map-test), só sem rota e sem menu.
export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />

          <Route element={<AppLayout />}>
            <Route path="/simulacao" element={<Simulation />} />
            <Route path="/visualizador" element={<Visualizer />} />
            <Route path="/CenarioBuilder" element={<CenarioBuilder />} />
            <Route path="/TaskBuilder" element={<TaskBuilder />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
