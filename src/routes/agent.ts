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

      /*
       * Simulation failure is a valid agent outcome,
       * not a server error.
       */
      if (result.status === "simulation_failed") {
        return reply.code(422).send({
          ok: false,
          ...result
        });
      }

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
          message:
            error instanceof Error
              ? error.message
              : String(error)
        }
      });
    }
  });
}