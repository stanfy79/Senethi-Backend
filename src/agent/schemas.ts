import { z } from "zod";

export const transferActionSchema = z.object({
  type: z.literal("transfer"),
  chainId: z.number().int().positive(),
  recipientAddress: z.string().min(1),
  amount: z.string().min(1),
  tokenAddress: z.string().optional()
});

export const executionStatusActionSchema = z.object({
  type: z.literal("get_execution_status"),
  executionId: z.string().min(1)
});

export const agentActionSchema = z.discriminatedUnion("type", [
  transferActionSchema,
  executionStatusActionSchema
]);

export type AgentAction = z.infer<typeof agentActionSchema>;