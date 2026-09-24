// Lógica PURA do loop de animação — porte do RobotSwarmSimulator
// (src/ui/simLoop.ts). O render roda em requestAnimationFrame (dt variável);
// a simulação roda em PASSO FIXO de 1/tick_hz. O acumulador guarda o tempo
// real que ainda não virou tick; o dt do frame é limitado pra aba em
// segundo plano não voltar "recuperando" segundos de uma vez.

export const MAX_FRAME_DT_S = 0.25;
export const MAX_TICKS_PER_FRAME = 100;

export interface StepPlan {
  ticks: number;
  acc: number;
}

export function planTicks(
  acc: number,
  frameDtSeconds: number,
  tickDt: number,
  maxFrameDt: number = MAX_FRAME_DT_S,
  maxTicks: number = MAX_TICKS_PER_FRAME,
): StepPlan {
  const dt = Math.min(Math.max(frameDtSeconds, 0), maxFrameDt);
  let next = acc + dt;
  let ticks = Math.floor(next / tickDt);
  if (ticks > maxTicks) {
    ticks = maxTicks;
    next = 0;
  } else {
    next -= ticks * tickDt;
  }
  return { ticks, acc: next };
}
