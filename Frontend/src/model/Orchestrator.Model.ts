/** Resultado de atribuir uma task a um robô manualmente. */
export interface TaskAssignmentModel {
  address: string;
  taskId: string;
}

/** Estado da atribuição automática de tasks do orquestrador. */
export interface AutoAssignModel {
  enabled: boolean;
}
