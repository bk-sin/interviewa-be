import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";

declare module "fastify" {
  export interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      plan: string;
    };
  }
}
