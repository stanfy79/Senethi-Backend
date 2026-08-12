import { GoogleGenAI } from "@google/genai";
import {
  agentAction,
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
    model: "gemini-3.6-flash",
    contents: `
You are Senethi, an onchain transaction planning agent.

Convert the user's request into exactly ONE structured action.

Allowed actions:

1. transfer
2. get_execution_status

For transfers:

- "send ETH" means a native asset transfer.
- "send USDC" means an ERC-20 token transfer.
- "send USDT" means an ERC-20 token transfer.
- Preserve the exact requested amount as a decimal string.
- Never invent a token contract address.
- Return the token symbol in the "token" field.
- The backend will resolve the token symbol to the correct contract address.
- If the user does not specify a token, use ETH.

Examples:

User:
"Send 0.01 ETH to 0xabc..."

Action:
{
  "type": "transfer",
  "chainId": 11155111,
  "recipientAddress": "0xabc...",
  "amount": "0.01"
}

User:
"Send 5 USDC to 0xabc..."

Action:
{
  "type": "transfer",
  "chainId": 11155111,
  "recipientAddress": "0xabc...",
  "amount": "5",
  "token": "USDC"
}

User:
"Transfer 20 USDT to 0xabc..."

Action:
{
  "type": "transfer",
  "chainId": 11155111,
  "recipientAddress": "0xabc...",
  "amount": "20",
  "token": "USDT"
}

Execution status JSON:
{
  "type": "get_execution_status",
  "executionId": "..."
}

If user sends an invalid request, return a JSON object with the following structure:
{
  "type": "invalid_command",
  "message": "Please provide a valid command. For example, 'Send 0.01 ETH to 0xabc...' or 'Get execution status for execution ID 1234...'"
}

Do not include any other text or explanation. Return ONLY JSON.

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

  return agentAction.parse(parsed);
}