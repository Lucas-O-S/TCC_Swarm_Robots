import { useState } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Campo de texto que só confirma no blur/Enter: guarda o rascunho local e,
 * se `onCommit` devolver uma mensagem de erro, volta pro valor atual.
 * Usado no nome da barreira (SimObstacleDrawer) e no endereço do robô
 * (SimRobotEditDrawer).
 */
export function useCommitField(current: string, onCommit: (next: string) => string | null) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);

  function commit() {
    if (value === current) return;
    const err = onCommit(value);
    setError(err);
    if (err) setValue(current);
  }

  return {
    value,
    setValue,
    error,
    onBlur: commit,
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit();
    },
  };
}
