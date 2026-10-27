/**
 * Task lifecycle state (our own concept, not part of the DotBot protocol).
 * Controls the task's lifecycle so automation knows which ones are free to assign.
 * Lives in the domain/model (like RobotStatus), not in the Protocol module.
 */
export enum TaskStatus {
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
}
