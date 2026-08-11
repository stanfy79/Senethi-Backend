import { GoogleGenAI } from "@google/genai";
import {
  agentActionSchema,
  type AgentAction
} from "./schemas.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function planAction(
  message: string,
  chainId?: number
): Promise<AgentAction> {

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `
You are Sentinel, an onchain transaction planning agent.

Convert the user's request into exactly ONE structured action.

Allowed actions:

1. transfer
2. get_execution_status

For transfer:
- Extract the amount.
- Extract the recipient address.
- Use the provided chainId when available.
- Never invent a recipient address.
- Never invent an amount.
- Never invent a chain ID.

Transfer JSON:
{
  "type": "transfer",
  "chainId": 11155111,
  "recipientAddress": "0x...",
  "amount": "0.001"
}

Execution status JSON:
{
  "type": "get_execution_status",
  "executionId": "..."
}

Return ONLY JSON.

User request:
${message}

Provided chain ID:
${chainId ?? "none"}
`
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Gemini returned invalid JSON: ${text}`
    );
  }

  return agentActionSchema.parse(parsed);
}