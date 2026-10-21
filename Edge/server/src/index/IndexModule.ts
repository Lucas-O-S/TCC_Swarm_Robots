import { SwarmModule } from "src/Classes/Swarm/Swarm.Module";
import { CommandModule } from "src/Classes/Commands/Command.Module";
import { Lh2Module } from "src/Classes/Lh2/Lh2.Module";

/**
 * Lista central de módulos da borda (mesmo padrão do IndexModule da API) -
 * importada com spread no app.module.ts.
 */
export const AllModules = [
    SwarmModule,
    CommandModule,
    Lh2Module,
];
