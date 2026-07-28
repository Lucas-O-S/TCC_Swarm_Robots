/**
 * Estado de uma Task (conceito nosso, não do protocolo DotBot). Controla o
 * ciclo de vida da tarefa pra automação saber quais estão livres pra atribuir.
 * Fica no domínio/model (como o RobotStatus), não no módulo de Protocolo.
 */
export enum TaskStatus {
    Pendente = 0,
    EmAndamento = 1,
    Concluida = 2,
    Cancelada = 3,
}
