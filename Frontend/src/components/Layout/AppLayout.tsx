import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './AppLayout.module.css';

// Uma aba do menu superior: rota + rótulo exibido.
interface NavItem {
  to: string;
  label: string;
}

// "Robôs" removida a pedido (2026-09-01): a tela saiu do projeto por
// enquanto (só a estrutura de integração com o backend ficou). Devolver
// aqui quando a tela voltar. "Tarefas" voltou como TaskBuilder.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Mapa & Conexão' },
  { to: '/simulacao', label: 'Simulação' },
  { to: '/visualizador', label: 'Visualizador' },
  { to: '/mapa-teste', label: 'Teste Mapa' },
  { to: '/CenarioBuilder', label: 'Construtor de Cenários' },
  { to: '/TaskBuilder', label: 'Tarefas' },
];

// Casca compartilhada por todas as telas autenticadas: marca MARI, menu de
// navegação entre telas e botão de sair. O conteúdo de cada rota é
// renderizado no lugar do <Outlet /> (ver AppRoutes.tsx).
export function AppLayout() {
  const navigate = useNavigate();
  const layoutRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLElement>(null);

  // Os drawers abrem logo abaixo da barra (a altura dela muda quando as abas
  // quebram de linha); rolando a página, sobem junto até o topo da janela.
  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const bottom = topbarRef.current?.getBoundingClientRect().bottom ?? 0;
      layoutRef.current?.style.setProperty('--drawer-top', `${Math.max(0, bottom)}px`);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = topbarRef.current ? new ResizeObserver(schedule) : null;
    if (observer && topbarRef.current) observer.observe(topbarRef.current);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function handleLogout() {
    // TODO: limpar sessão/token quando a autenticação real existir.
    navigate('/login');
  }

  return (
    <div className={styles.layout} ref={layoutRef}>
      <header className={styles.topbar} ref={topbarRef}>
        <span className={styles.brand}>
          <svg viewBox="0 0 24 24" className={styles.brandIcon} aria-hidden="true">
            <path
              d="M12 1 21 6.5 21 17.5 12 23 3 17.5 3 6.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          MARI
        </span>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className={styles.logout} onClick={handleLogout}>
          Sair
        </button>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
