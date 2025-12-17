/**
 * Interview Routes
 * Define las rutas HTTP y conecta con el controller
 */

import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { InterviewController } from "./interview.controller";
import { InterviewOrchestrator } from "../application/interview-orchestrator";

export default async function interviewRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  // Inicializar dependencias
  // TODO: Implementar repositorios y servicios reales
  const orchestrator = new InterviewOrchestrator();
  const controller = new InterviewController(orchestrator);

  /**
   * POST /start
   * Inicia una nueva entrevista
   */
  fastify.post("/start", async (request, reply) =>
    controller.startInterview(request, reply)
  );

  /**
   * POST /:id/answer
   * Submit una respuesta de audio
   */
  fastify.post("/:id/answer", async (request, reply) =>
    controller.submitAnswer(request, reply)
  );

  /**
   * GET /:id/state
   * Obtiene el estado actual (polling)
   */
  fastify.get("/:id/state", async (request, reply) =>
    controller.getState(request, reply)
  );

  /**
   * POST /:id/continue
   * Continuar después de feedback/checkpoint
   */
  fastify.post("/:id/continue", async (request, reply) =>
    controller.continue(request, reply)
  );

  /**
   * POST /:id/pause
   * Pausar la entrevista
   */
  fastify.post("/:id/pause", async (request, reply) =>
    controller.pause(request, reply)
  );

  /**
   * POST /:id/resume
   * Resumir una entrevista pausada
   */
  fastify.post("/:id/resume", async (request, reply) =>
    controller.resume(request, reply)
  );

  /**
   * GET /active
   * Obtiene la entrevista activa del usuario actual
   */
  fastify.get("/active", async (request, reply) =>
    controller.getActiveInterview(request, reply)
  );

  /**
   * POST /:id/heartbeat
   * Actualiza el heartbeat de la sesión
   */
  fastify.post("/:id/heartbeat", async (request, reply) =>
    controller.heartbeat(request, reply)
  );
}
