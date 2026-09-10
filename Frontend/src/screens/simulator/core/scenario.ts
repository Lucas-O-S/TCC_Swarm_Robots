import type { Scenario } from './types';

// Cenário padrão carregado ao abrir a tela — mesmo formato descrito em
// SIMULADOR_PLANO.md, seção 7. Endereços em hex de 16 caracteres, como a
// coluna `address` do backend (`VARCHAR(16)`).
export const DEFAULT_SCENARIO: Scenario = {
  version: 1,
  name: 'exemplo (1)',
  arena: { widthMm: 2000, heightMm: 2000, gridMm: 100 },
  obstacles: [{ id: 'wall-1', x: 900, y: 900, w: 400, h: 200 }],
  robots: [
    { address: 'bdf2b04bc00d2701', label: 'R01', x: 200, y: 200, theta: 0, battery: 100 },
    { address: 'bdf2b04bc00d2702', label: 'R02', x: 500, y: 300, theta: 45, battery: 95 },
    { address: 'bdf2b04bc00d2703', label: 'R03', x: 1400, y: 1500, theta: 180, battery: 60 },
    { address: 'bdf2b04bc00d2704', label: 'R04', x: 1700, y: 300, theta: 270, battery: 40 },
  ],
};

export function exportScenario(scenario: Scenario): string {
  return JSON.stringify(scenario, null, 2);
}

export function importScenario(json: string): Scenario {
  const parsed = JSON.parse(json) as Partial<Scenario>;
  if (!parsed.arena || !Array.isArray(parsed.robots)) {
    throw new Error('JSON de cenário inválido: faltam os campos "arena" e/ou "robots".');
  }
  return {
    version: parsed.version ?? 1,
    name: parsed.name ?? 'cenário importado',
    arena: parsed.arena,
    obstacles: parsed.obstacles ?? [],
    robots: parsed.robots,
  };
}
