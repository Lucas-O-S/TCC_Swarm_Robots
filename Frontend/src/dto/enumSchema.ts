import { z } from 'zod';

/**
 * Schema que só aceita os valores numéricos de um enum `as const`
 * (ex.: `RobotControlMode`) — equivalente ao `@IsEnum(...)` do backend.
 */
export function enumValueSchema<T extends Record<string, number>>(values: T, message: string) {
  const allowed: number[] = Object.values(values);
  return z.custom<T[keyof T]>((value) => typeof value === 'number' && allowed.includes(value), message);
}
