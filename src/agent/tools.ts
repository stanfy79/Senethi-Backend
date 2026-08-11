import { KeeperHubClient } from "../keeperhub/client.js";
import type { AgentAction } from "./schemas.ts";

const keeperHub = new KeeperHubClient();

export async function executeAgentAction(
  action: AgentAction,
  taskId: string
) {
  switch (action.type) {

    case "transfer": {
      const execution =
        await keeperHub.executeTransferSafely({
          taskId,
          chainId: action.chainId,
          recipientAddress: action.recipientAddress,
          amount: action.amount,
          tokenAddress: action.tokenAddress
        });

      return {
        type: "transfer_result",
        execution
      };
    }

    case "get_execution_status": {
      const execution =
        await keeperHub.getExecutionStatus(
          action.executionId
        );

      return {
        type: "execution_status",
        execution
      };
    }
  }
}