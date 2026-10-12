/**
 * Espelha `src/Enums/Command.enum.ts` do backend: o "rótulo" de cada comando
 * que sai pro robô. É também o **último segmento da URL**
 * (`PUT /robots/:address/<comando>`), então o `RobotRepository` monta as
 * rotas a partir daqui em vez de repetir strings soltas.
 */
export const RobotCommand = {
  MoveRaw: 'move-raw',
  RgbLed: 'rgb-led',
  ControlMode: 'control-mode',
  Waypoints: 'waypoints',
  XgoAction: 'xgo-action',
} as const;

export type RobotCommand = (typeof RobotCommand)[keyof typeof RobotCommand];
