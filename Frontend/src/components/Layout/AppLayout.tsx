import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './AppLayout.module.css';

// Uma aba do menu superior: rota + rótulo exibido.
interface NavItem {
  to: string;
  label: string;
}

// "Robôs" e "Tarefas" removidas a pedido (2026-09-01): as telas saíram do
// projeto por enquanto (só a estrutura de integração com o backend
// ficou) — ver STATUS.md. Devolver aqui quando as telas voltarem.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Mapa & Conexão' },
  { to: '/simulacao', label: 'Simulação' },
];

// Casca compartilhada por todas as telas autenticadas: marca MARI, menu de
// navegação entre telas e botão de sair. O conteúdo de cada rota é
// renderizado no lugar do <Outlet /> (ver AppRoutes.tsx).
export function AppLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    // TODO: limpar sessão/token quando a autenticação real existir.
    navigate('/login');
  }

  return (
    <div className={styles.layout}>
      <header className={styles.topbar}>
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
