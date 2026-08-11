import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),
  KEEPERHUB_API_KEY: z.string().min(1),
  KEEPERHUB_API_URL: z.string().url().default("https://app.keeperhub.com/api"),
  KEEPERHUB_MCP_URL: z.string().url().default("https://app.keeperhub.com/mcp"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5"),
  DEFAULT_CHAIN_ID: z.coerce.number().default(11155111),
  RPC_URL: z.string().url(),
  EXPLORER_TX_BASE: z.string().url().default("https://sepolia.etherscan.io/tx/")
});

export const env = schema.parse(process.env);
