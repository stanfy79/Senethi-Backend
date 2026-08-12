import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyPrivyToken } from "./privy.js";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      sessionId?: string;
    };
  }
}

export async function requirePrivyAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return reply.code(401).send({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization header",
      },
    });
  }

  if (!authorization.startsWith("Bearer ")) {
    return reply.code(401).send({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid Authorization header",
      },
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return reply.code(401).send({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Privy access token",
      },
    });
  }

  try {
    const claims = await verifyPrivyToken(token);

    request.user = {
      id: claims.user_id,
      sessionId: claims.session_id,
    };
  } catch (error) {
    request.log.warn(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      "Privy authentication failed"
    );

    return reply.code(401).send({
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired Privy access token",
      },
    });
  }
}