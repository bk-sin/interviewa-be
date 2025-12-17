/**
 * Interview Controller
 * Maneja las solicitudes HTTP y delega a la capa de orquestación
 */

import { FastifyReply, FastifyRequest } from "fastify";
import { InterviewOrchestrator } from "../application/interview-orchestrator";
import { InterviewNotFoundError } from "../infrastructure/in-memory.repository";

export class InterviewController {
  constructor(private readonly orchestrator: InterviewOrchestrator) {}

  async startInterview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { roleId } = request.body as { roleId: string };
      const userId = "mock-user-id";

      const result = await this.orchestrator.startInterview(userId, roleId);
      const state = await this.orchestrator.getState(result.id);

      return reply.code(201).send({
        interviewId: result.id,
        state: state.state,
        screen: state.screen,
        payload: {
          question: result.currentQuestion,
          totalQuestions: result.totalQuestions,
        },
      });
    } catch (error) {
      request.log.error(error, "Error starting interview");
      return reply.code(500).send({
        error: "InternalServerError",
        message: "Failed to start interview",
      });
    }
  }

  async submitAnswer(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      const { audioUrl, durationMs } = request.body as {
        audioUrl: string;
        durationMs: number;
      };

      await this.orchestrator.submitAnswer(interviewId, audioUrl, durationMs);
      const state = await this.orchestrator.getState(interviewId);

      return reply.code(200).send({
        state: state.state,
        screen: state.screen,
        payload: {
          partialFeedback: state.payload?.feedback,
        },
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async continue(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      const result = await this.orchestrator.continue(interviewId);

      return reply.code(200).send({
        state: result.state,
        screen: result.screen,
        payload: {
          question: result.question,
          checkpoint: result.checkpoint,
        },
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async pause(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      await this.orchestrator.pause(interviewId);

      return reply.code(200).send({
        success: true,
        message: "Interview paused",
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async resume(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      const result = await this.orchestrator.resume(interviewId);

      return reply.code(200).send({
        state: result.state,
        screen: result.screen,
        payload: {
          question: result.question,
          message: result.message,
        },
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async getState(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      const state = await this.orchestrator.getState(interviewId);

      return reply.code(200).send({
        state: state.state,
        screen: state.screen,
        payload: state.payload,
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async getActiveInterview(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = "mock-user-id";
      const result = await this.orchestrator.getActiveInterview(userId);

      if (!result) {
        return reply.code(200).send({
          canResume: false,
          interview: null,
        });
      }

      return reply.code(200).send(result);
    } catch (error) {
      request.log.error(error, "Error getting active interview");
      return reply.code(500).send({
        error: "InternalServerError",
        message: "Failed to get active interview",
      });
    }
  }

  async heartbeat(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      await this.orchestrator.updateHeartbeat(interviewId);

      return reply.code(200).send({ success: true });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: interviewId } = request.params as { id: string };
      const summary = await this.orchestrator.getSummary(interviewId);

      if (summary.isProcessing) {
        return reply.code(202).send({
          status: "processing",
          message: "Summary is being generated",
        });
      }

      return reply.code(200).send({
        summary: summary.data,
      });
    } catch (error) {
      return this.handleError(error, request, reply);
    }
  }

  private handleError(
    error: unknown,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const err = error as any;
    request.log.error(error);

    if (err instanceof InterviewNotFoundError || err.code === "NOT_FOUND") {
      return reply.code(404).send({
        error: "NotFound",
        message: "Interview not found",
      });
    }

    if (err.code === "INVALID_STATE" || err.name === "InvalidTransitionError") {
      return reply.code(400).send({
        error: "InvalidTransition",
        message: err.message || "Invalid state transition",
      });
    }

    if (err.code === "CANNOT_RESUME" || err.name === "CannotResumeError") {
      return reply.code(400).send({
        error: "CannotResume",
        message: err.message || "Interview cannot be resumed",
      });
    }

    return reply.code(500).send({
      error: "InternalServerError",
      message: "An unexpected error occurred",
    });
  }
}
