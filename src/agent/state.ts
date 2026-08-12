export type AgentState =
  | "planning"
  | "simulating"
  | "simulation_failed"
  | "executing"
  | "checking_execution"
  | "completed"
  | "failed";

export type RecoveryAction =
  | "none"
  | "retry_simulation"
  | "check_execution"
  | "abort";

export type AgentStateData = {
  state: AgentState;
  recoveryAction: RecoveryAction;
  attempts: number;
  lastError?: unknown;
};