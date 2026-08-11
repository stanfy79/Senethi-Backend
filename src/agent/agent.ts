import crypto from "node:crypto";
import { planAction } from "./planner.js";
import { executeAgentAction } from "./tools.js";

export async function runAgent(
  message: string,
  chainId?: number
) {
  const taskId = `agent-${crypto.randomUUID()}`;

  console.log("[AGENT] Task:", taskId);
  console.log("[AGENT] User:", message);

  // PHASE 1
  const action = await planAction(
    message,
    chainId
  );

  console.log(
    "[AGENT] Planned action:",
    JSON.stringify(action, null, 2)
  );

  // PHASE 2 + 3
  const result = await executeAgentAction(
    action,
    taskId
  );

  console.log(
    "[AGENT] Result:",
    JSON.stringify(result, null, 2)
  );

  return {
    taskId,
    action,
    result
  };
}