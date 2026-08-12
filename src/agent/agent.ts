import crypto from "node:crypto";
import { planAction } from "./planner.js";
import {
  simulateAgentAction,
  executeAgentAction
} from "./tools.js";

export async function runAgent(
  message: string,
  chainId?: number
) {
  const taskId = `agent-${crypto.randomUUID()}`;

  console.log("\n==============================");
  console.log("[AGENT] Starting task");
  console.log("[AGENT] Task ID:", taskId);
  console.log("[AGENT] User:", message);
  console.log("==============================\n");

  /*
   * PHASE 1
   * Understand the user's intent.
   */
  const action = await planAction(
    message,
    chainId
  );

  console.log(
    "[AGENT] Planned action:",
    JSON.stringify(action, null, 2)
  );

  /*
   * PHASE 2
   * Simulate before allowing execution.
   */
  console.log("[AGENT] Simulating through KeeperHub...");

  const simulationResult =
    await simulateAgentAction(
      action,
      taskId
    );

  console.log(
    "[AGENT] Simulation:",
    JSON.stringify(
      simulationResult,
      null,
      2
    )
  );

  /*
   * Non-transaction actions don't need
   * the simulation gate.
   */
  if (action.type !== "transfer") {
    return {
      taskId,
      action,
      simulation: simulationResult,
      result: simulationResult
    };
  }

  const simulation =
    simulationResult.simulation as any;

  /*
   * HARD SAFETY GATE
   *
   * Never execute if KeeperHub says
   * the transaction would revert.
   */
  if (
    simulation?.wouldRevert === true ||
    simulation?.success === false
  ) {
    console.log(
      "[AGENT] Simulation failed. Execution blocked."
    );

    return {
      taskId,
      action,

      status: "simulation_failed",

      simulation: {
        success: false,
        wouldRevert: simulation?.wouldRevert ?? true,
        failureKind: simulation?.failureKind,
        revertReason:
          simulation?.revertReason ??
          simulation?.error ??
          "Transaction simulation failed",
        code: simulation?.code,
        balanceWei: simulation?.balanceWei,
        requiredWei: simulation?.requiredWei,
        shortfallWei: simulation?.shortfallWei,
        nativeSymbol: simulation?.nativeSymbol
      },

      result: null
    };
  }

  /*
   * PHASE 3
   * Simulation succeeded.
   *
   * Now and only now do we execute.
   */
  console.log(
    "[AGENT] Simulation successful."
  );

  console.log(
    "[AGENT] Executing through KeeperHub..."
  );

  const executionResult =
    await executeAgentAction(
      action,
      taskId
    );

  console.log(
    "[AGENT] Execution:",
    JSON.stringify(
      executionResult,
      null,
      2
    )
  );

  const execution =
    executionResult.execution as any;

  /*
   * PHASE 4
   * Observe final execution state.
   */
  const completed =
    execution?.status === "completed";

  return {
    taskId,
    action,

    status: completed
      ? "completed"
      : execution?.status ?? "unknown",

    simulation: {
      success: true,
      wouldRevert: false,
      gasEstimate: simulation?.gasEstimate
    },

    result: executionResult,

    execution: {
      executionId:
        execution?.executionId,

      status:
        execution?.status,

      transactionHash:
        execution?.transactionHash,

      transactionLink:
        execution?.transactionLink
    }
  };
}