import { z } from "zod";

export const transferAction = z.object({
  type: z.literal("transfer"),
  chainId: z.number().int().positive(),
  recipientAddress: z.string(),
  amount: z.string(),
  tokenAddress: z.string().optional()
});

export const contractCallAction = z.object({
  type: z.literal("contract_call"),
  chainId: z.number().int().positive(),
  contractAddress: z.string(),
  functionName: z.string(),
  functionArgs: z.array(z.unknown()).default([]),
  abi: z.array(z.unknown()).optional(),
  value: z.string().optional()
});

export const protocolAction = z.object({
  type: z.literal("protocol_action"),
  actionType: z.string(),
  chainId: z.number().int().positive(),
  inputs: z.record(z.string(), z.unknown())
});

export const agentAction = z.discriminatedUnion("type", [
  transferAction,
  contractCallAction,
  protocolAction
]);

export const agentPlan = z.object({
  reply: z.string(),
  actions: z.array(agentAction)
});

export type AgentPlan = z.infer<typeof agentPlan>;
