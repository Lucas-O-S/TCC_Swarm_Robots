// Ícones das ferramentas de mapa (SVG inline, sem lib externa — mesmo
// espírito do resto do projeto). `currentColor` faz o traço acompanhar a
// cor do texto do botão (ver MapToolButton.module.css `.active`).
const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Setas nas 4 direções — ferramenta "Mover" (arrastar o mapa).
export function MoveIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="9 6 12 3 15 6" />
      <polyline points="9 18 12 21 15 18" />
      <polyline points="6 9 3 12 6 15" />
      <polyline points="18 9 21 12 18 15" />
    </svg>
  );
}

// Seta de cursor — ferramenta "Clicar" (seleção simples, sem arrastar).
export function SelectIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 3 L5 18 L9 14.2 L11.8 20.5 L14.3 19.4 L11.6 13.2 L17 13 Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Quadrado só com as bordas + um "+" no meio — ferramenta "Obstáculo"
// (desenhar/adicionar um bloco no mapa).
export function ObstacleIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <line x1="12" y1="8.5" x2="12" y2="15.5" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
    </svg>
  );
}
