// users.routes.ts
import { FastifyPluginAsync } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { syncUserSchema, userResponseSchema } from "./users.schema";
import * as usersController from "./users.controller"; // Importamos el controlador

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /users/sync
  server.post(
    "/sync",
    {
      schema: {
        description: "Sync user from Clerk to database",
        tags: ["users"],
        body: syncUserSchema,
        response: {
          200: userResponseSchema,
          400: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    usersController.syncUserHandler
  );

  // GET /users/me
  server.get(
    "/me",
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: "Get current authenticated user",
        tags: ["users"],
        response: {
          200: userResponseSchema,
          401: z.object({ error: z.string(), message: z.string() }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    usersController.getMeHandler
  );

  fastify.log.info("✅ Users routes registered");
};

export default usersRoutes;
