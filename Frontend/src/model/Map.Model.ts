import type { CenarioModel } from "./Cenario.Model";
import type { RobotModel } from "./Robot.Model";

export interface MapModel {
    cenario: CenarioModel;
    robots: RobotModel[];
}
