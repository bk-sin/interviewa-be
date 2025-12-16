import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    clerkClient: ReturnType<typeof createClerkClient>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Verificar que tenemos la API key de Clerk
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is not defined in environment variables");
  }

  // Crear instancia de Clerk Client y decorarla en fastify
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  fastify.decorate("clerkClient", clerkClient);

  // Decorator para autenticación
  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Obtener token del header Authorization
        const authHeader = request.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Missing or invalid authorization header",
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verificar token JWT y obtener el userId directamente del token
        // Clerk usa session tokens que incluyen el userId en el payload
        let userId: string;

        try {
          // Intentar obtener el usuario desde el token de sesión
          const sessionToken = await clerkClient.sessions.verifySession(
            token,
            token
          );
          userId = sessionToken.userId;
        } catch (verifyError) {
          // Si falla la verificación de sesión, intentar como JWT regular
          throw new Error("Invalid session token");
        }

        if (!userId) {
          return reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid token",
          });
        }

        // Obtener información completa del usuario desde Clerk
        const clerkUser = await clerkClient.users.getUser(userId);

        // Buscar usuario en nuestra DB
        const [dbUser] = await fastify.db
          .select()
          .from(users)
          .where(eq(users.id, clerkUser.id))
          .limit(1);

        if (!dbUser) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "User not synced. Please call /users/sync first.",
          });
        }

        // Adjuntar usuario al request
        request.user = {
          id: dbUser.id,
          email: dbUser.email,
          plan: dbUser.plan,
        };

        fastify.log.info({ userId: request.user.id }, "User authenticated");
      } catch (error) {
        fastify.log.error({ error }, "Authentication error");

        return reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid or expired token",
        });
      }
    }
  );

  fastify.log.info("✅ Auth plugin registered");
};

export default fp(authPlugin, {
  name: "auth-plugin",
  dependencies: ["db-plugin"], // Depende del plugin de DB
});
