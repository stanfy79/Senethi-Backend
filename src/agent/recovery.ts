import { KeeperHubClient } from "../keeperhub/client.js";

const keeperHub = new KeeperHubClient();

const MAX_SIMULATION_RETRIES = 2;

export async function recoverSimulation(
  action: any,
  taskId: string,
  attempt: number
) {
  if (attempt >= MAX_SIMULATION_RETRIES) {
    return {
      action: "abort" as const,
      reason: "Maximum simulation retries reached."
    };
  }

  const errorCode =
    action?.simulation?.code;

  const failureKind =
    action?.simulation?.failureKind;

  // These are deterministic failures.
  // Retrying will not fix them.
  const deterministicFailures = [
    "insufficient_balance",
    "invalid_recipient",
    "unsupported_chain",
    "validation"
  ];

  if (
    deterministicFailures.includes(errorCode) ||
    failureKind === "validation"
  ) {
    return {
      action: "abort" as const,
      reason:
        "The transaction cannot succeed without changing the request."
    };
  }

  return {
    action: "retry_simulation" as const,
    reason:
      "The simulation failure may be temporary."
  };
}

export async function recoverExecution(
  executionId: string
) {
  const result =
    await keeperHub.getExecutionStatus(
      executionId
    );

  const execution = result;

  if (execution?.status === "completed") {
    return {
      action: "complete" as const,
      execution
    };
  }

  if (execution?.status === "failed") {
    return {
      action: "failed" as const,
      execution
    };
  }

  return {
    action: "check_execution" as const,
    execution
  };
}