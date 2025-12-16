// users.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import * as usersService from "./users.service";
import { SyncUserInput } from "./users.schema";

// Handler para sincronizar usuario
export async function syncUserHandler(
  request: FastifyRequest<{ Body: SyncUserInput }>,
  reply: FastifyReply
) {
  // Simplemente llamamos al servicio. Si falla, Fastify captura el error globalmente
  // (O podemos usar un try/catch específico si queremos personalizar mucho el error 400)
  try {
    const user = await usersService.syncUser(request.body);
    return reply.status(200).send(user);
  } catch (error) {
    request.log.error(error);
    // Retornamos un error controlado
    return reply.status(400).send({
      error: "Sync Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Handler para obtener perfil (Me)
export async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // La validación de autenticación ya ocurrió en el hook 'onRequest' de la ruta
  // TypeScript ahora sabe que user existe gracias al archivo .d.ts
  if (!request.user) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", message: "No user data" });
  }

  const user = await usersService.getUserById(request.user.id);

  if (!user) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "User not found" });
  }

  return reply.status(200).send(user);
}
