import { KeeperHubClient } from "../keeperhub/client.js";
import type { AgentAction } from "./schemas.js";

const keeperHub = new KeeperHubClient();

export async function simulateAgentAction(
  action: AgentAction,
  taskId: string
) {
  switch (action.type) {
    case "transfer": {
      const simulation = await keeperHub.simulateTransfer({
        taskId,
        chainId: action.chainId,
        recipientAddress: action.recipientAddress,
        amount: action.amount,
        tokenAddress: action.tokenAddress
      });

      return {
        type: "transfer_simulation",
        simulation
      };
    }

    case "get_execution_status": {
      const status = await keeperHub.getExecutionStatus(
        action.executionId
      );

      return {
        type: "execution_status",
        execution: status
      };
    }
  }
}

export async function executeAgentAction(
  action: AgentAction,
  taskId: string
) {
  switch (action.type) {
    case "transfer": {
      const execution =
        await keeperHub.executeTransfer({
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