import type { ScenarioModel } from "./Scenario.Model";
import type { RobotModel } from "./Robot.Model";

export interface MapModel {
    scenario: ScenarioModel;
    robots: RobotModel[];
}