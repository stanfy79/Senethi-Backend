import { isAddress } from "viem";
import { KeeperHubClient } from "../keeperhub/client.js";
import { KeeperHubMcp } from "../keeperhub/mcp.js";
import type { AgentPlan } from "./types.js";

const kh = new KeeperHubClient();
const mcp = new KeeperHubMcp();

export async function executePlan(plan: AgentPlan, taskId: string) {
  const results: unknown[] = [];

  for (let index = 0; index < plan.actions.length; index++) {
    const action = plan.actions[index];

    if (action.type === "transfer") {
      if (!isAddress(action.recipientAddress)) {
        throw new Error(`Invalid recipient address: ${action.recipientAddress}`);
      }

      const result = await kh.executeTransferSafely({
        taskId: `${taskId}:action:${index}`,
        chainId: action.chainId,
        recipientAddress: action.recipientAddress,
        amount: action.amount,
        tokenAddress: action.tokenAddress
      });

      results.push({ index, action, result });
      continue;
    }

    if (action.type === "contract_call") {
      if (!isAddress(action.contractAddress)) {
        throw new Error(`Invalid contract address: ${action.contractAddress}`);
      }

      const result = await kh.executeContractCallSafely({
        taskId: `${taskId}:action:${index}`,
        chainId: action.chainId,
        contractAddress: action.contractAddress,
        functionName: action.functionName,
        functionArgs: JSON.stringify(action.functionArgs),
        abi: action.abi ? JSON.stringify(action.abi) : undefined,
        value: action.value
      });

      results.push({ index, action, result });
      continue;
    }

    if (action.type === "protocol_action") {
      // Discover first so the agent cannot blindly call an unknown action type.
      const discovered = await mcp.searchProtocolActions(action.actionType);
      const result = await mcp.executeProtocolAction({
        actionType: action.actionType,
        chainId: String(action.chainId),
        inputs: action.inputs,
        discovered
      });

      results.push({ index, action, result });
    }
  }

  return { taskId, results };
}
