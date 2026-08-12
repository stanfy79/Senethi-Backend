import { PrivyClient } from "@privy-io/node";
import { env } from "../config.js";

export const privy = new PrivyClient({
  appId: env.PRIVY_APP_ID,
  appSecret: env.PRIVY_APP_SECRET,
});

export async function verifyPrivyToken(
  token: string
) {
  return privy
    .utils()
    .auth()
    .verifyAuthToken(token);
}