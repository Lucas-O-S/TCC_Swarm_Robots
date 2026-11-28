import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './MiniLineChart.module.css';

export interface MiniLinePoint {
  /** null = sem dado nesse ponto (a linha quebra). */
  y: number | null;
  /** Valor formatado — a parte forte do tooltip (ex.: "42 ms"). */
  value: string;
  /** Contexto do ponto no tooltip (ex.: "máx 80 ms · 12 anúncios · há 30 s"). */
  detail: string;
}

interface MiniLineChartProps {
  title: string;
  /** Valor atual, à direita do título (o rótulo do fim da linha). */
  current?: string;
  /** Pontos igualmente espaçados no tempo, do mais velho pro mais novo. */
  points: MiniLinePoint[];
  /** Unidade do eixo y (ex.: "ms", "%"). */
  unit: string;
  /** Topo mínimo do eixo y, pra variação pequena não parecer enorme. */
  minTop?: number;
  /** Rótulos das pontas do eixo x (ex.: "−1 min" e "agora"). */
  startLabel: string;
  endLabel: string;
  /** Texto no lugar da linha quando nenhum ponto tem dado. */
  emptyText: string;
}

/** Arredonda o topo do eixo pra cima num número redondo (1, 2, 2,5, 5 × 10^k). */
function niceTop(max: number, minTop: number): number {
  const v = Math.max(max, minTop);
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= v) return m * mag;
  return 10 * mag;
}

/** Linha (e área) em trechos: cada null quebra o trecho. Coordenadas no viewBox 0..100 × 0..100. */
function paths(points: MiniLinePoint[], xOf: (i: number) => number, yOf: (y: number) => number) {
  let line = '';
  let area = '';
  let run: { x: number; y: number }[] = [];
  const flush = () => {
    if (run.length === 0) return;
    line += `M${run.map((p) => `${p.x},${p.y}`).join('L')}`;
    if (run.length === 1) line += 'l0,0'; // ponto isolado: a ponta redonda vira um pingo
    area += `M${run[0].x},100L${run.map((p) => `${p.x},${p.y}`).join('L')}L${run[run.length - 1].x},100Z`;
    run = [];
  };
  points.forEach((p, i) => {
    if (p.y === null) flush();
    else run.push({ x: xOf(i), y: yOf(p.y) });
  });
  flush();
  return { line, area };
}

// Gráfico de linha pequeno, uma série só (o título diz o que é), pra
// acompanhar um número no tempo dentro de um cartão: linha de 2 px com a
// área clarinha embaixo, linhas de grade finas no topo e na base, bolinha no
// último ponto e, ao passar o mouse (ou com as setas, com foco), uma linha
// vertical no ponto mais próximo com o valor dele. Os mesmos valores vão
// numa tabela escondida, pra leitor de tela.
export function MiniLineChart({ title, current, points, unit, minTop = 0, startLabel, endLabel, emptyText }: MiniLineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const values = points.flatMap((p) => (p.y === null ? [] : [p.y]));
  const top = niceTop(values.reduce((m, v) => Math.max(m, v), 0), minTop);
  const n = points.length;
  const xOf = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const yOf = (y: number) => 100 - (Math.max(0, Math.min(top, y)) / top) * 100;
  const { line, area } = paths(points, xOf, yOf);

  let lastIndex = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (points[i].y !== null) {
      lastIndex = i;
      break;
    }
  }

  const shown = hover !== null ? points[hover] : null;

  function pick(e: PointerEvent<HTMLDivElement>) {
    if (n === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const rel = box.width > 0 ? (e.clientX - box.left) / box.width : 0;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }

  function step(e: KeyboardEvent<HTMLDivElement>) {
    if (n === 0 || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    const from = hover ?? (lastIndex >= 0 ? lastIndex : n - 1);
    setHover(Math.max(0, Math.min(n - 1, from + (e.key === 'ArrowLeft' ? -1 : 1))));
  }

  const dot = (i: number, y: number, className: string) => (
    <span className={className} style={{ left: `${xOf(i)}%`, top: `${yOf(y)}%` }} />
  );

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{title}</span>
        {current && <strong className={styles.current}>{current}</strong>}
      </figcaption>

      <div className={styles.frame}>
        <span className={styles.yTop}>
          {top} {unit}
        </span>
        <div
          className={styles.plot}
          tabIndex={0}
          role="img"
          aria-label={`${title}${current ? `: ${current}` : ''}. Setas pra ver cada ponto.`}
          onPointerMove={pick}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(lastIndex >= 0 ? lastIndex : null)}
          onBlur={() => setHover(null)}
          onKeyDown={step}
        >
          <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line className={styles.grid} x1="0" y1="0" x2="100" y2="0" />
            <line className={styles.grid} x1="0" y1="100" x2="100" y2="100" />
            {area && <path className={styles.area} d={area} />}
            {line && <path className={styles.line} d={line} />}
          </svg>

          {values.length === 0 && <span className={styles.empty}>{emptyText}</span>}
          {lastIndex >= 0 && hover === null && dot(lastIndex, points[lastIndex].y as number, styles.dot)}

          {hover !== null && shown && (
            <>
              <span className={styles.crosshair} style={{ left: `${xOf(hover)}%` }} />
              {shown.y !== null && dot(hover, shown.y, styles.dot)}
              <span className={`${styles.tooltip} ${xOf(hover) > 50 ? styles.tooltipLeft : styles.tooltipRight}`} role="status">
                <strong>{shown.y === null ? 'sem dado' : shown.value}</strong>
                <span>{shown.detail}</span>
              </span>
            </>
          )}
        </div>
        <span className={styles.yBottom}>0</span>
      </div>

      <div className={styles.xAxis} aria-hidden="true">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>

      <table className={styles.srOnly}>
        <caption>{title}</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{p.detail}</td>
              <td>{p.y === null ? 'sem dado' : p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
