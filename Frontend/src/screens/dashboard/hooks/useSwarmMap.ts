import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { Robot } from '../types';

// Constantes do desenho do mapa.
const PADDING = 40;
const CELL = 40;
const HEX_R = 13;
const WIDTH = 580;
const HEIGHT = 480;

interface RobotPoint extends Robot {
  x: number;
  y: number;
}

// Converte a coluna/linha do robô em coordenadas de tela.
function toPoints(robots: Robot[]): RobotPoint[] {
  return robots.map((r) => ({
    ...r,
    x: PADDING + r.col * CELL,
    y: PADDING + r.row * CELL,
  }));
}

// Encapsula toda a lógica do canvas: desenho do grid, hexágonos,
// destaque do robô sob o cursor e cálculo da posição do tooltip.
export function useSwarmMap(robots: Robot[], hoveredId: number | null) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = toPoints(robots);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // fundo
    ctx.fillStyle = '#ede5d0';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // grid
    const cols = Math.floor((WIDTH - PADDING * 2) / CELL);
    const rows = Math.floor((HEIGHT - PADDING * 2) / CELL);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      const x = PADDING + c * CELL;
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, PADDING + rows * CELL);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      const y = PADDING + r * CELL;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(PADDING + cols * CELL, y);
      ctx.stroke();
    }

    // hexágono auxiliar
    const hexPath = (x: number, y: number, radius: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + radius * Math.cos(a);
        const py = y + radius * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // robôs
    points.forEach((robo) => {
      const isHovered = robo.id === hoveredId;
      const isOffline = !robo.online;

      if (isHovered) {
        ctx.save();
        hexPath(robo.x, robo.y, HEX_R + 6);
        ctx.strokeStyle = '#c06800';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      hexPath(robo.x, robo.y, HEX_R);
      ctx.fillStyle = isOffline
        ? isHovered
          ? 'rgba(242,140,40,0.75)'
          : 'rgba(242,140,40,0.40)'
        : isHovered
          ? '#e07818'
          : '#f28c28';
      ctx.fill();
    });
  }, [points, hoveredId]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Descobre qual robô está sob o cursor.
  const hitTest = useCallback(
    (e: MouseEvent<HTMLCanvasElement>): Robot | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const found = points.find((r) => {
        const dx = mx - r.x;
        const dy = my - r.y;
        return Math.sqrt(dx * dx + dy * dy) <= HEX_R + 6;
      });
      return found ?? null;
    },
    [points],
  );

  // Posição (em px de tela) para posicionar o tooltip sobre o robô.
  const tooltipPos = useCallback((robot: Robot) => {
    const canvas = canvasRef.current;
    const x = PADDING + robot.col * CELL;
    const y = PADDING + robot.row * CELL;
    if (!canvas) return { left: 0, top: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    return { left: x * scaleX, top: y * scaleY };
  }, []);

  return { canvasRef, hitTest, tooltipPos, width: WIDTH, height: HEIGHT };
}
