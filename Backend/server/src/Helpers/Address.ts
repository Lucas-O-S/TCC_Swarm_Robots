/**
 * Forma canônica de `address`: hex em MAIÚSCULAS (igual swarmit/CLI e a borda).
 * Todo address que entra no banco ou é comparado passa por aqui - ver AGENTS.md,
 * "Don't". A borda tem a mesma regra no Protocol.normalizeAddress dela; aqui é
 * uma cópia de propósito, para a API não depender do código da borda.
 */
export function normalizeAddress(address: string): string {
    return address.toUpperCase();
}
