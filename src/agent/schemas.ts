import { z } from "zod";

export const transferAction = z.object({
  type: z.literal("transfer"),

  chainId: z.number().int().positive(),

  recipientAddress: z.string().min(1),

  amount: z.string().min(1),

  token: z.string().min(1).optional(),

  tokenAddress: z.string().optional(),
});

export const executionStatusAction = z.object({
  type: z.literal("get_execution_status"),
  executionId: z.string().min(1),
});

export const errorAction = z.object({
  type: z.literal("invalid_command"),
  message: z.string().min(1),
});

export const agentAction = z.discriminatedUnion("type", [
  transferAction,
  executionStatusAction,
  errorAction,
]);


export type AgentAction = z.infer<typeof agentAction>;