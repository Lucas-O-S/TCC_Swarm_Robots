import type { ChangeEvent } from 'react';

/** onChange de <input type="number"/"range"> que só repassa valores numéricos válidos — usado pelos drawers de robô da Simulação. */
export function num(handler: (v: number) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v)) handler(v);
  };
}
