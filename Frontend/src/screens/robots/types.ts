// Tipos locais provisórios desta tela (UI).
// Substituir pelos modelos de `model/` quando você criá-los.
export interface Robot {
  id: number;
  label: string;
  condition: string; // Ativo, Sem bateria, Out of Bounds
  battery: number | null; // porcentagem, ou null quando indisponível ("-")
}
