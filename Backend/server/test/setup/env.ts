import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Carrega o test/.env.test antes de qualquer import do src: os arquivos de
 * config (auth, orchestrator, sequelize, edge) leem o process.env na hora do
 * import. O override garante que o .env de desenvolvimento não vale aqui.
 */
config({ path: resolve(__dirname, '..', '.env.test'), override: true, quiet: true });
