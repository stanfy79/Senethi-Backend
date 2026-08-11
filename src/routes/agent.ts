import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { runAgent } from "../agent/agent.js";

const agentRequest = z.object({
  message: z.string().min(1),
  chainId: z.coerce.number().int().positive().optional()
});

export async function agentRoutes(
  app: FastifyInstance
) {

  app.post("/v1/agent/run", async (req, reply) => {

    try {
      const body = agentRequest.parse(req.body);

      const result = await runAgent(
        body.message,
        body.chainId
      );

      return reply.send({
        ok: true,
        ...result
      });

    } catch (error: any) {

      console.error(
        "[AGENT] Error:",
        error
      );

      return reply.code(500).send({
        ok: false,
        error: {
          code: "AGENT_ERROR",
          message: error.message
        }
      });
    }
  });
}