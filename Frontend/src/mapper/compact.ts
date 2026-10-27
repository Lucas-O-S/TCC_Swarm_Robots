/**
 * Remove as chaves `undefined` de um objeto. Os corpos de `POST`/`PUT`
 * só devem carregar o que de fato foi informado: o backend (`PartialType` +
 * `forbidNonWhitelisted`) trata "campo ausente" como "não mexer".
 * `null` é preservado de propósito (é um valor: ex.: `taskId: null` solta a task).
 */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
}
