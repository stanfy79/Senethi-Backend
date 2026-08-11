import type { FastifyInstance } from "fastify";
import { KeeperHubClient } from "../keeperhub/client.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    service: "keeper-agent-backend"
  }));

  app.get("/health/keeperhub", async (_request, reply) => {
    const kh = new KeeperHubClient();

    try {
      const chains = await kh.chains();

      return reply.send({
        ok: true,
        keeperhub: {
          rest: true,
          mcp: "not tested",
          chains: chains
        }
      });
    } catch (error: any) {
      return reply.status(502).send({
        ok: false,
        keeperhub: {
          rest: false,
          error: error.message
        }
      });
    }
  });
}