import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from './Joystick.module.css';

interface JoystickProps {
  /** Diâmetro da base, em px. */
  size?: number;
  /**
   * Vetor normalizado do manche: x ∈ [-1, 1] (direita +), y ∈ [-1, 1]
   * (PRA CIMA +). Chamado ao encostar, a cada 1/`rateHz` enquanto arrasta
   * (mesmo parado — como o joystick de verdade, que fica transmitindo) e
   * com (0, 0) ao soltar.
   */
  onChange: (x: number, y: number) => void;
  /** Frequência de envio enquanto arrasta. Default 10 Hz (malha manual do MOVE_RAW, 10–20 Hz). */
  rateHz?: number;
  /** Fração do raio ignorada perto do centro (zona morta). Default 0.08. */
  deadZone?: number;
  disabled?: boolean;
  className?: string;
}

/** Quantas vezes o (0, 0) é repetido depois de soltar — se a rede perder uma parada, a próxima segura o robô. */
const RELEASE_REPEATS = 3;

// Joystick virtual de arrastar (estilo controle na tela de jogo de celular):
// encosta e arrasta a bolinha dentro da base; soltou, ela volta pro centro e
// o manche zera. Genérico — só devolve o vetor normalizado; quem usa decide
// o que fazer com ele (ex.: SimRobotDrawer mistura em PWM das duas rodas).
// Pointer events com capture: funciona com mouse, toque e caneta, e o
// arrasto continua mesmo se o dedo sair da base.
export function Joystick({ size = 150, onChange, rateHz = 10, deadZone = 0.08, disabled = false, className = '' }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 }); // px, relativo ao centro (y pra baixo, da tela)
  const [dragging, setDragging] = useState(false);

  const draggingRef = useRef(false);
  const vector = useRef({ x: 0, y: 0 });
  const releaseLeft = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const knobSize = Math.round(size * 0.4);
  const travel = (size - knobSize) / 2; // quanto o centro da bolinha pode andar

  function stopTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  function ensureTimer() {
    if (timer.current) return;
    timer.current = setInterval(() => {
      onChangeRef.current(vector.current.x, vector.current.y);
      if (releaseLeft.current > 0) {
        releaseLeft.current -= 1;
        if (releaseLeft.current === 0) stopTimer();
      }
    }, 1000 / rateHz);
  }

  // Desmontou arrastando (ex.: drawer fechou): para o robô e o timer.
  useEffect(
    () => () => {
      if (timer.current) {
        stopTimer();
        onChangeRef.current(0, 0);
      }
    },
    [],
  );

  function update(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > travel) {
      dx = (dx / dist) * travel;
      dy = (dy / dist) * travel;
    }
    setKnob({ x: dx, y: dy });

    const nx = dx / travel;
    const ny = -dy / travel; // tela tem Y pra baixo; o manche, pra cima
    const inDeadZone = Math.hypot(nx, ny) < deadZone;
    vector.current = inDeadZone ? { x: 0, y: 0 } : { x: nx, y: ny };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    releaseLeft.current = 0;
    update(e);
    onChangeRef.current(vector.current.x, vector.current.y);
    ensureTimer();
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (draggingRef.current) update(e);
  }

  function release(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    draggingRef.current = false;
    setDragging(false);
    setKnob({ x: 0, y: 0 });
    vector.current = { x: 0, y: 0 };
    onChangeRef.current(0, 0);
    releaseLeft.current = RELEASE_REPEATS;
    ensureTimer();
  }

  return (
    <div
      ref={baseRef}
      className={`${styles.base} ${dragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      role="slider"
      aria-label="Joystick: arraste pra mover"
      aria-disabled={disabled}
    >
      <span className={`${styles.arrow} ${styles.up}`}>▲</span>
      <span className={`${styles.arrow} ${styles.down}`}>▼</span>
      <span className={`${styles.arrow} ${styles.left}`}>◀</span>
      <span className={`${styles.arrow} ${styles.right}`}>▶</span>
      <span
        className={styles.knob}
        style={{
          width: knobSize,
          height: knobSize,
          marginLeft: -knobSize / 2,
          marginTop: -knobSize / 2,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
        }}
      />
    </div>
  );
}
