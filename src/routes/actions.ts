import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { KeeperHubClient } from "../keeperhub/client.js";

const transfer = z.object({
  taskId: z.string().min(1),
  chainId: z.coerce.number().int().positive(),
  recipientAddress: z.string(),
  amount: z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/),
  tokenAddress: z.string().optional()
});

const contractCall = z.object({
  taskId: z.string().min(1),
  chainId: z.coerce.number().int().positive(),
  contractAddress: z.string(),
  functionName: z.string().min(1),
  functionArgs: z.array(z.unknown()).default([]),
  abi: z.array(z.unknown()).optional(),
  value: z.string().optional()
});

function keeperError(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error);

  // KeeperHub client errors are formatted as:
  // KeeperHub 400: {"success":false,...}
  const match = message.match(
    /^KeeperHub\s+(\d+):\s+(.+)$/
  );

  if (!match) {
    return {
      statusCode: 500,
      code: "KEEPERHUB_ERROR",
      message
    };
  }

  const httpStatus = Number(match[1]);
  const rawBody = match[2];

  let body: any;

  try {
    body = JSON.parse(rawBody);
  } catch {
    body = {
      error: rawBody
    };
  }

  /*
   * KeeperHub can return HTTP 400 for a transaction
   * that was successfully simulated but would fail.
   */
  if (body?.code === "insufficient_balance") {
    return {
      statusCode: 402,
      code: "INSUFFICIENT_BALANCE",
      message: body.revertReason ?? body.error,
      details: {
        balanceWei: body.balanceWei,
        requiredWei: body.requiredWei,
        shortfallWei: body.shortfallWei,
        nativeSymbol: body.nativeSymbol,
        from: body.from,
        to: body.to
      },
      retryable: true
    };
  }

  if (body?.wouldRevert === true) {
    return {
      statusCode: 422,
      code: "TRANSACTION_WOULD_REVERT",
      message: body.revertReason ?? body.error ?? "Transaction would revert",
      details: {
        failureKind: body.failureKind,
        from: body.from,
        to: body.to
      },
      retryable: false
    };
  }

  if (
    body?.code === "invalid_recipient" ||
    body?.code === "invalid_address"
  ) {
    return {
      statusCode: 400,
      code: "INVALID_RECIPIENT",
      message: body.error ?? "Invalid recipient address",
      retryable: false
    };
  }

  if (
    body?.code === "unsupported_chain" ||
    body?.code === "chain_not_supported"
  ) {
    return {
      statusCode: 400,
      code: "UNSUPPORTED_CHAIN",
      message: body.error ?? "Unsupported blockchain",
      retryable: false
    };
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return {
      statusCode: 502,
      code: "KEEPERHUB_AUTH_ERROR",
      message: "KeeperHub authentication or authorization failed",
      retryable: false
    };
  }

  if (httpStatus === 429) {
    return {
      statusCode: 503,
      code: "KEEPERHUB_RATE_LIMITED",
      message: "KeeperHub rate limit reached",
      retryable: true
    };
  }

  if (httpStatus >= 400 && httpStatus < 500) {
    return {
      statusCode: 400,
      code: body?.code ?? "KEEPERHUB_REQUEST_ERROR",
      message: body?.error ?? body?.message ?? "KeeperHub rejected the request",
      details: body,
      retryable: false
    };
  }

  return {
    statusCode: 502,
    code: "KEEPERHUB_ERROR",
    message: body?.error ?? body?.message ?? "KeeperHub request failed",
    details: body,
    retryable: true
  };
}

export async function actionRoutes(app: FastifyInstance) {
  const kh = new KeeperHubClient();

  /*
   * TRANSFER
   */
  app.post("/v1/actions/transfer", async (req, reply) => {
    try {
      const body = transfer.parse(req.body);

      const result = await kh.executeTransferSafely(body);

      return reply.send({
        ok: result.status === "completed",
        execution: result
      });

    } catch (error) {
      const normalized = keeperError(error);

      console.error("[TRANSFER] Failed:", {
        code: normalized.code,
        message: normalized.message
      });

      return reply.code(normalized.statusCode).send({
        ok: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable,
          ...(normalized.details
            ? { details: normalized.details }
            : {})
        }
      });
    }
  });

  /*
   * TRANSFER SIMULATION
   */
  app.post("/v1/actions/transfer/simulate", async (req, reply) => {
    try {
      const body = transfer.parse(req.body);

      const result = await kh.simulateTransfer(body);

      /*
       * Simulation itself can return HTTP 200/400 depending
       * on KeeperHub behavior, so explicitly inspect the
       * simulation result.
       */
      if (result?.wouldRevert === true) {
        const code =
          result.code === "insufficient_balance"
            ? "INSUFFICIENT_BALANCE"
            : "TRANSACTION_WOULD_REVERT";

        const statusCode =
          result.code === "insufficient_balance"
            ? 402
            : 422;

        return reply.code(statusCode).send({
          ok: false,
          simulation: {
            status: "simulated",
            wouldRevert: true,
            code,
            message:
              result.revertReason ??
              result.error ??
              "Transaction would revert",
            details: {
              failureKind: result.failureKind,
              from: result.from,
              to: result.to,
              balanceWei: result.balanceWei,
              requiredWei: result.requiredWei,
              shortfallWei: result.shortfallWei,
              nativeSymbol: result.nativeSymbol
            }
          }
        });
      }

      return reply.send({
        ok: true,
        simulation: result
      });

    } catch (error) {
      const normalized = keeperError(error);

      console.error("[TRANSFER SIMULATE] Failed:", {
        code: normalized.code,
        message: normalized.message
      });

      return reply.code(normalized.statusCode).send({
        ok: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable,
          ...(normalized.details
            ? { details: normalized.details }
            : {})
        }
      });
    }
  });

  /*
   * EXECUTION STATUS
   */
  app.get("/v1/actions/:executionId", async (req, reply) => {
    try {
      const { executionId } =
        req.params as { executionId: string };

      const result =
        await kh.getExecutionStatus(executionId);

      return reply.send(result);

    } catch (error) {
      const normalized = keeperError(error);

      return reply.code(normalized.statusCode).send({
        ok: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          retryable: normalized.retryable
        }
      });
    }
  });
}