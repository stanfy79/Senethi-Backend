import crypto from "node:crypto";
import { planAction } from "./planner.js";
import { simulateAgentAction, executeAgentAction } from "./tools.js";
import { createTask, updateTask } from "./tasks.js";
import { recoverSimulation, recoverExecution } from "./recovery.js";
import { generateAgentResponse } from "./response.js";
import { resolveToken } from "./tokens.js";

export async function runAgent(message: string, chainId?: number) {
  const task = await createTask(message);
  const taskId = task.taskId;

  console.log("\n==============================");
  console.log("[AGENT] Starting task");
  console.log("[AGENT] Task ID:", taskId);
  console.log("[AGENT] User:", message);
  console.log("==============================\n");

  /*
   * PHASE 1
   * Understand the user's intent.
   */
  const action = await planAction(message, chainId);

  if (action.type === "transfer" && action.token) {
    const token = resolveToken(action.chainId, action.token);

    if (!token) {
      await updateTask(taskId, {
        status: "failed",
        error: {
          code: "UNSUPPORTED_TOKEN",
          message: `Token ${action.token} is not supported on chain ${action.chainId}`,
        },
      });

      return {
        taskId,
        action,
        status: "failed",
        response: {
          message: `I don't support ${action.token} on this network yet.`,
        },
      };
    }

    action.tokenAddress = token.address;
  }

  await updateTask(taskId, {
    action,
  });

  console.log("[AGENT] Planned action:", JSON.stringify(action, null, 2));

  /*
   * PHASE 2
   * Simulate before allowing execution.
   */
  console.log("[AGENT] Simulating through KeeperHub...");

  const simulationResult = await simulateAgentAction(action, taskId);

  await updateTask(taskId, {
    status: action.type === "transfer" ? "simulating" : "completed",
    simulation: simulationResult,
  });

  console.log("[AGENT] Simulation:", JSON.stringify(simulationResult, null, 2));

  /*
   * Non-transaction actions don't need
   * the simulation gate.
   */
  if (action.type !== "transfer") {
    return {
      taskId,
      action,
      simulation: simulationResult,
      result: simulationResult,
    };
  }

  const simulation = simulationResult.simulation as any;

  /*
   * Never execute if KeeperHub says
   * the transaction would revert.
   */
  if (simulation?.wouldRevert === true || simulation?.success === false) {
    const recovery = await recoverSimulation(
      {
        simulation,
      },
      taskId,
      0,
    );

    console.log("[AGENT] Recovery decision:", recovery);

    if (recovery.action === "retry_simulation") {
      console.log("[AGENT] Retrying simulation...");

      await updateTask(taskId, {
        status: "simulating",
      });

      const retryResult = await simulateAgentAction(action, taskId);

      const retrySimulation = retryResult.simulation as any;

      if (
        retrySimulation?.wouldRevert === true ||
        retrySimulation?.success === false
      ) {
        await updateTask(taskId, {
          status: "simulation_failed",
          simulation: simulationResult,
        });

        return {
          taskId,
          action,
          status: "simulation_failed",
          simulation: retrySimulation,
          recovery,
        };
      }

      const executionResult = await executeAgentAction(action, taskId);

      const execution = executionResult.execution as any;

      return {
        taskId,
        action,
        status: execution?.status ?? "unknown",
        simulation: retrySimulation,
        result: executionResult,
        execution: {
          executionId: execution?.executionId,
          status: execution?.status,
          transactionHash: execution?.transactionHash,
          transactionLink: execution?.transactionLink,
        },
        recovery,
      };
    }

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
        nativeSymbol: simulation?.nativeSymbol,
      },
      result: null,
      recovery,
    };
  }

  /*
   * PHASE 3
   * Simulation succeeded.
   *
   * Now and only now do we execute.
   */
  console.log(
    "[AGENT] Simulation:",
    JSON.stringify(simulationResult.execution?.status, null, 2),
  );

  console.log("[AGENT] Executing through KeeperHub...");

  await updateTask(taskId, {
    status: "executing",
  });

  const executionResult = await executeAgentAction(action, taskId);

  console.log(
    "[AGENT] Execution:",
    JSON.stringify(executionResult, null, 2),
  );

  const execution = executionResult.execution as any;

  let finalExecution = execution;

  if (
    execution?.executionId &&
    execution?.status !== "completed" &&
    execution?.status !== "failed"
  ) {
    console.log("[AGENT] Execution state uncertain.");

    const recovery = await recoverExecution(execution.executionId);

    console.log("[AGENT] Execution recovery:", recovery);

    if (recovery.action === "complete") {
      finalExecution = recovery.execution;
    } else if (recovery.action === "failed") {
      finalExecution = recovery.execution;
    } else {
      await updateTask(taskId, {
        status: "checking_execution",
        executionId: recovery.execution?.executionId,
      });

      return {
        taskId,
        action,
        status: "checking_execution",
        result: executionResult,
        execution: recovery.execution,
        recovery,
      };
    }
  }

  /*
   * PHASE 4
   * Observe final execution state.
   */
  const completed = finalExecution?.status === "completed";

  await updateTask(taskId, {
    status: finalExecution?.status === "completed" ? "completed" : "failed",

    executionId: finalExecution?.executionId,
    transactionHash: finalExecution?.transactionHash,
    transactionLink: finalExecution?.transactionLink,
    error:
      finalExecution?.status === "completed"
        ? undefined
        : finalExecution?.error,
  });

  const result = {
    taskId,
    action,

    status: completed ? "completed" : (finalExecution?.status ?? "unknown"),

    simulation: {
      success: true,
      wouldRevert: false,
      gasEstimate: simulation?.gasEstimate,
    },

    execution: finalExecution,
  };

  const response = generateAgentResponse(result);

  return {
    result,
    response,
  };
}
