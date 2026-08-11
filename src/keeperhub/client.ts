import crypto from "node:crypto";
import { env } from "../config.js";

export type KeeperExecution = {
  executionId: string;
  status: "pending" | "running" | "completed" | "failed" | string;
  type?: string;
  transactionHash?: string;
  transactionLink?: string;
  gasUsedWei?: string;
  result?: unknown;
  error?: unknown;
  createdAt?: string;
  completedAt?: string;
};

export type TransferRequest = {
  taskId: string;
  chainId: number;
  recipientAddress: string;
  amount: string;
  tokenAddress?: string;
  tokenConfig?: string;
  gasLimitMultiplier?: string;
};

function idempotencyKey(input: TransferRequest) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        taskId: input.taskId,
        chainId: input.chainId,
        recipientAddress: input.recipientAddress.toLowerCase(),
        amount: input.amount,
        tokenAddress: input.tokenAddress?.toLowerCase()
      })
    )
    .digest("hex");
}

async function keeperRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${env.KEEPERHUB_API_URL}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${env.KEEPERHUB_API_KEY}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      }
    }
  );

  const text = await response.text();

  let body: any;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(
      `KeeperHub ${response.status}: ${JSON.stringify(body)}`
    );
  }

  return body as T;
}

export class KeeperHubClient {

  async chains() {
    return keeperRequest<any>("/chains");
  }

  async simulateTransfer(input: TransferRequest) {
    return keeperRequest<any>("/execute/transfer", {
      method: "POST",
      body: JSON.stringify({
        chainId: input.chainId,
        recipientAddress: input.recipientAddress,
        amount: input.amount,
        ...(input.tokenAddress
          ? { tokenAddress: input.tokenAddress }
          : {}),
        ...(input.tokenConfig
          ? { tokenConfig: input.tokenConfig }
          : {}),
        ...(input.gasLimitMultiplier
          ? { gasLimitMultiplier: input.gasLimitMultiplier }
          : {}),
        simulate: true
      })
    });
  }

  async executeTransfer(input: TransferRequest) {
    return keeperRequest<KeeperExecution>(
      "/execute/transfer",
      {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey(input)
        },
        body: JSON.stringify({
          chainId: input.chainId,
          recipientAddress: input.recipientAddress,
          amount: input.amount,
          ...(input.tokenAddress
            ? { tokenAddress: input.tokenAddress }
            : {}),
          ...(input.tokenConfig
            ? { tokenConfig: input.tokenConfig }
            : {}),
          ...(input.gasLimitMultiplier
            ? { gasLimitMultiplier: input.gasLimitMultiplier }
            : {})
        })
      }
    );
  }

  async executeTransferSafely(input: TransferRequest) {

    console.log("[KeeperHub] Simulating transaction...");

    const simulation = await this.simulateTransfer(input);

    if (!simulation.success || simulation.wouldRevert) {
      throw new Error(
        `Transaction simulation failed: ${
          simulation.revertReason ??
          simulation.error ??
          "unknown error"
        }`
      );
    }

    console.log("[KeeperHub] Simulation successful");
    console.log(
      `[KeeperHub] Estimated gas: ${simulation.gasEstimate}`
    );

    console.log("[KeeperHub] Broadcasting transaction...");

    const execution = await this.executeTransfer(input);

    console.log(
      `[KeeperHub] Execution ${execution.executionId}: ${execution.status}`
    );

    return execution;
  }

  async getExecutionStatus(executionId: string) {
    return keeperRequest<KeeperExecution>(
      `/execute/${encodeURIComponent(executionId)}/status`
    );
  }
}