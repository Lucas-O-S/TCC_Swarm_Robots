import 'dotenv/config';
import type { StringValue } from 'ms';

/**
 * Ponto único pra ligar/desligar autenticação no projeto inteiro: mude
 * AUTH_ACTIVATED no .env (true/false). Com false, o JwtAuthGuard libera
 * geral - útil enquanto o front/mobile ainda não implementou login.
 */
export const authConfig = {
    activated: process.env.AUTH_ACTIVATED === 'true',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me',
    jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as StringValue,
};
