// Faixa de bateria do DotBot medida no robô real (supercapacitor): até
// 0,45 V o robô já conta como vazio e 2,96 V é o máximo que a carga alcança.
// Menor/igual a BATTERY_EMPTY_MV = 0%, maior/igual a BATTERY_FULL_MV = 100%,
// linear no meio. Único lugar a mudar no front (leitura, rampa da Simulação
// e orquestrador local usam daqui).
export const BATTERY_EMPTY_MV = 450;
export const BATTERY_FULL_MV = 2960;

/** Bateria baixa = 20% da faixa (≈ 952 mV) — mesmo limite do backend. */
export const LOW_BATTERY_PCT = 20;
export const LOW_BATTERY_MV = Math.round(
  BATTERY_EMPTY_MV + (LOW_BATTERY_PCT / 100) * (BATTERY_FULL_MV - BATTERY_EMPTY_MV),
);
