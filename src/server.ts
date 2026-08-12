import Fastify from "fastify";
import cors from "@fastify/cors";

import { env } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { actionRoutes } from "./routes/actions.js";
import { agentRoutes } from "./routes/agent.js";
import { connectDatabase } from "./database.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],
});

await connectDatabase();

await app.register(healthRoutes);
await app.register(actionRoutes);
await app.register(agentRoutes);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  const status =
    Number((error as any).status) || 500;

  const body = (error as any).body;

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  reply.status(status).send({
    ok: false,
    error: message,
    keeperHub: body ?? undefined,
  });
});

await app.listen({
  port: env.PORT,
  host: env.HOST,
});

console.log(
  `Keeper Agent backend listening on http://${env.HOST}:${env.PORT}`
);