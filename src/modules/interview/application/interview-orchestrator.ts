/**
 * Interview Orchestrator
 * Core service que orquesta el flujo completo de la entrevista
 *
 * 🎯 ARQUITECTURA:
 * - Event-driven state machine con métodos semánticos como API pública
 * - Todos los cambios de estado pasan por next(sessionId, event)
 * - Los métodos públicos son wrappers que disparan eventos internamente
 *
 * ⚠️ MVP FAST-PATH:
 * Algunos métodos (como submitAnswer) ejecutan múltiples transiciones sincrónicas
 * para simular procesos que en producción serían asíncronos (transcripción AI, feedback).
 * Esto está documentado en cada método con notas "FAST-PATH IMPLEMENTATION".
 *
 * 🔄 FLUJO DE TRANSICIONES:
 * INTRO → QUESTION → RECORDING → PROCESSING → MICRO_FEEDBACK → QUESTION ...
 * Checkpoints cada 5 preguntas, COMPLETED al final.
 * PAUSED puede ocurrir en QUESTION/MICRO_FEEDBACK/CHECKPOINT.
 */

import { InterviewSession, Question } from "../domain/interview-session.entity";
import { InterviewState } from "../domain/interview-state";
import { InterviewEvent } from "../domain/interview-events";
import {
  StateManager,
  InvalidTransitionError,
} from "../services/state-manager.service";
import { QuestionEngine } from "../services/question-engine.service";
import { FeedbackEngine } from "../services/feedback-engine.service";
import { AdaptationEngine } from "../services/adaptation-engine.service";
import {
  InMemoryInterviewRepository,
  InterviewNotFoundError,
} from "../infrastructure/in-memory.repository";
import { mapStateToScreen, type Screen } from "./screen-mapper";

interface OrchestratorResponse {
  state: InterviewState;
  screen: Screen;
  payload?: any;
}

class CannotResumeError extends Error {
  code = "CANNOT_RESUME";
  constructor(message: string) {
    super(message);
    this.name = "CannotResumeError";
  }
}

export class InterviewOrchestrator {
  private readonly stateManager: StateManager;
  private readonly questionEngine: QuestionEngine;
  private readonly feedbackEngine: FeedbackEngine;
  private readonly adaptationEngine: AdaptationEngine;
  private readonly repository: InMemoryInterviewRepository;

  constructor(
    stateManager?: StateManager,
    questionEngine?: QuestionEngine,
    feedbackEngine?: FeedbackEngine,
    adaptationEngine?: AdaptationEngine,
    repository?: InMemoryInterviewRepository
  ) {
    // Inyectar dependencias o crear instancias por defecto
    this.stateManager = stateManager ?? new StateManager();
    this.questionEngine = questionEngine ?? new QuestionEngine();
    this.feedbackEngine = feedbackEngine ?? new FeedbackEngine();
    this.adaptationEngine = adaptationEngine ?? new AdaptationEngine();
    this.repository = repository ?? new InMemoryInterviewRepository();
  }

  /**
   * Método principal: procesa eventos y transiciona estados
   *
   * Este es el corazón del orchestrator
   */
  async next(
    sessionId: string,
    event: InterviewEvent,
    data?: any
  ): Promise<OrchestratorResponse> {
    // 1. Load session
    const session = await this.repository.getById(sessionId);

    if (!session) {
      throw new InterviewNotFoundError(sessionId);
    }

    // 2. Validate transition
    // FEEDBACK_ACK is dynamically validated based on nextAction
    if (event !== InterviewEvent.FEEDBACK_ACK) {
      this.stateManager.assertTransition(session.state, event);
    } else {
      // For FEEDBACK_ACK, just validate we're in MICRO_FEEDBACK
      if (session.state !== InterviewState.MICRO_FEEDBACK) {
        throw new InvalidTransitionError(
          `Cannot acknowledge feedback from state ${session.state}`
        );
      }
    }

    // 3. Side effects (BEFORE state change)
    let payload: any = {};

    switch (event) {
      case InterviewEvent.INTRO_DONE: {
        // Cargar primera pregunta
        const question = this.questionEngine.getQuestion(
          session.currentQuestionIndex
        );
        payload = { question };
        break;
      }

      case InterviewEvent.ANSWER_SUBMITTED: {
        // Generar feedback mock inmediato
        const feedback = this.feedbackEngine.generateMockFeedback(
          data?.answerDuration ?? 60000
        );

        session.updateFeedback(feedback as any);
        payload = { feedback };
        break;
      }

      case InterviewEvent.PROCESSING_DONE: {
        // Decidir qué sigue
        const decision = this.adaptationEngine.decide({
          questionIndex: session.currentQuestionIndex,
          totalQuestions: session.totalQuestions,
          feedback: session.lastFeedback,
        });

        // Guardar decisión en sesión
        (session as any).nextAction = decision.action;
        payload = { decision };
        break;
      }

      case InterviewEvent.FEEDBACK_ACK: {
        // Usuario reconoció el feedback, decidir siguiente pantalla
        const nextAction = (session as any).nextAction;

        if (nextAction === "CHECKPOINT") {
          payload = {
            type: "CHECKPOINT",
            score: session.confidenceTrend,
            progress: session.currentQuestionIndex / session.totalQuestions,
          };
        } else if (nextAction === "COMPLETE") {
          payload = {
            type: "COMPLETE",
            totalQuestions: session.currentQuestionIndex + 1,
          };
        } else {
          // Avanzar a siguiente pregunta
          session.currentQuestionIndex += 1;
          session.askedQuestions.push(
            this.questionEngine.getQuestion(session.currentQuestionIndex - 1).id
          );

          const nextQuestion = this.questionEngine.getQuestion(
            session.currentQuestionIndex
          );
          payload = { question: nextQuestion };
        }
        break;
      }

      case InterviewEvent.CHECKPOINT_ACK: {
        // Continuar después de checkpoint
        session.currentQuestionIndex += 1;
        const nextQuestion = this.questionEngine.getQuestion(
          session.currentQuestionIndex
        );
        payload = { question: nextQuestion };
        break;
      }

      case InterviewEvent.COMPLETE_INTERVIEW: {
        // Marcar como completada
        session.complete();
        payload = {
          summary: "Interview completed successfully",
          totalQuestions: session.currentQuestionIndex + 1,
        };
        break;
      }

      case InterviewEvent.PAUSE: {
        // Guardar el estado actual antes de pausar
        session.previousState = session.state;
        payload = {
          message: "Interview paused",
          previousState: session.state,
        };
        break;
      }

      case InterviewEvent.RESUME: {
        // Recuperar datos del estado actual (QUESTION)
        const question = this.questionEngine.getQuestion(
          session.currentQuestionIndex
        );
        payload = {
          question,
          message: "Interview resumed",
        };
        break;
      }
    }

    // 4. State transition
    // For FEEDBACK_ACK, determine next state dynamically based on nextAction
    let nextState: InterviewState;
    if (event === InterviewEvent.FEEDBACK_ACK) {
      const nextAction = (session as any).nextAction;
      if (nextAction === "CHECKPOINT") {
        nextState = InterviewState.CHECKPOINT;
      } else if (nextAction === "COMPLETE") {
        nextState = InterviewState.COMPLETED;
        session.complete();
      } else {
        nextState = InterviewState.QUESTION;
      }
    } else {
      nextState = this.stateManager.transition(session.state, event);
    }
    session.transition(nextState);

    // 5. Persist
    await this.repository.save(session);

    // 6. Map state → screen
    return {
      state: nextState,
      screen: mapStateToScreen(nextState),
      payload,
    };
  }

  /**
   * Inicia una nueva entrevista
   */
  async startInterview(
    userId: string,
    roleId: string
  ): Promise<{
    id: string;
    state: InterviewState;
    currentQuestion: Question;
    totalQuestions: number;
    estimatedDuration: number;
  }> {
    // 1. Crear sesión
    const sessionId = crypto.randomUUID();

    const session = new InterviewSession(
      sessionId,
      userId,
      roleId,
      InterviewState.INTRO,
      null,
      0,
      [],
      this.questionEngine.getTotalQuestions()
    );

    // 2. Crear entrevista (nueva)
    await this.repository.create(session);

    // 3. Transicionar a primera pregunta usando next()
    const result = await this.next(sessionId, InterviewEvent.INTRO_DONE);

    return {
      id: session.id,
      state: result.state,
      currentQuestion: result.payload.question,
      totalQuestions: session.totalQuestions,
      estimatedDuration: session.totalQuestions * 120, // 2 min por pregunta
    };
  }

  /**
   * Procesa una respuesta (audio)
   *
   * ⚠️ FAST-PATH IMPLEMENTATION (MVP):
   * Este método ejecuta múltiples transiciones de estado de forma sincrónica:
   * QUESTION → RECORDING → PROCESSING → MICRO_FEEDBACK
   *
   * En producción, estas transiciones serían asíncronas:
   * 1. RECORDING: Usuario sube audio al storage
   * 2. PROCESSING: Job en queue procesa audio (transcripción + IA)
   * 3. MICRO_FEEDBACK: Webhook notifica cuando el feedback está listo
   *
   * Para MVP, simulamos el flujo completo con feedback mock instantáneo.
   * La sesión termina en MICRO_FEEDBACK, lista para continue().
   */
  async submitAnswer(
    interviewId: string,
    audioUrl: string,
    durationMs: number
  ): Promise<{
    answerId: string;
    estimatedTimeMs: number;
    partialFeedback?: any;
  }> {
    const answerId = crypto.randomUUID();

    // Obtener sesión actual para verificar el estado
    const session = await this.repository.getById(interviewId);

    if (!session) {
      throw new InterviewNotFoundError(interviewId);
    }

    // Si está en QUESTION, primero transicionar a RECORDING
    if (session.state === InterviewState.QUESTION) {
      await this.next(interviewId, InterviewEvent.START_RECORDING);
    }

    // 1. Transicionar a PROCESSING con el evento ANSWER_SUBMITTED
    // En producción: guardar audio, encolar job de transcripción
    const result = await this.next(
      interviewId,
      InterviewEvent.ANSWER_SUBMITTED,
      {
        answerDuration: durationMs,
        audioUrl,
        answerId,
      }
    );

    // 2. Inmediatamente transicionar a MICRO_FEEDBACK
    // En producción: esto ocurriría cuando el job de IA termine (webhook)
    await this.next(interviewId, InterviewEvent.PROCESSING_DONE);

    return {
      answerId,
      estimatedTimeMs: 2500,
      partialFeedback: result.payload?.feedback,
    };
  }

  /**
   * Obtiene el estado actual de la entrevista
   */
  async getState(interviewId: string): Promise<{
    state: InterviewState;
    screen: Screen;
    payload?: any;
  }> {
    // 1. Obtener sesión
    const session = await this.repository.getById(interviewId);

    if (!session) {
      throw new InterviewNotFoundError(interviewId);
    }

    // 2. Construir payload según estado
    let payload: any = {};

    switch (session.state) {
      case InterviewState.QUESTION:
        payload = {
          question: this.questionEngine.getQuestion(
            session.currentQuestionIndex
          ),
          progress: session.currentQuestionIndex / session.totalQuestions,
        };
        break;

      case InterviewState.MICRO_FEEDBACK:
        payload = {
          feedback: session.lastFeedback,
          progress: session.currentQuestionIndex / session.totalQuestions,
        };
        break;

      case InterviewState.CHECKPOINT:
        payload = {
          type: "CHECKPOINT",
          score: session.confidenceTrend,
          progress: session.currentQuestionIndex / session.totalQuestions,
          answersCount: session.currentQuestionIndex,
        };
        break;

      case InterviewState.COMPLETED:
        payload = {
          summary: "Interview completed successfully",
          totalQuestions: session.currentQuestionIndex,
        };
        break;
    }

    // 3. Retornar
    return {
      state: session.state,
      screen: mapStateToScreen(session.state),
      payload,
    };
  }

  /**
   * Continúa después de feedback/checkpoint
   */
  async continue(interviewId: string): Promise<{
    state: InterviewState;
    screen: Screen;
    question?: Question;
    checkpoint?: any;
  }> {
    // 1. Obtener sesión para determinar el estado actual
    const session = await this.repository.getById(interviewId);

    if (!session) {
      throw new InterviewNotFoundError(interviewId);
    }

    // 2. Determinar el evento apropiado según el estado
    let event: InterviewEvent;

    if (session.state === InterviewState.MICRO_FEEDBACK) {
      event = InterviewEvent.FEEDBACK_ACK;
    } else if (session.state === InterviewState.CHECKPOINT) {
      event = InterviewEvent.CHECKPOINT_ACK;
    } else {
      throw new InvalidTransitionError(
        `Cannot continue from state ${session.state}`
      );
    }

    // 3. Usar next() para transicionar
    const result = await this.next(interviewId, event);

    return {
      state: result.state,
      screen: result.screen,
      question: result.payload?.question,
      checkpoint:
        result.payload?.type === "CHECKPOINT" ? result.payload : undefined,
    };
  }

  /**
   * Pausa la entrevista
   */
  async pause(interviewId: string): Promise<void> {
    await this.next(interviewId, InterviewEvent.PAUSE);
  }

  /**
   * Resume una entrevista pausada
   */
  async resume(interviewId: string): Promise<{
    state: InterviewState;
    screen: Screen;
    question?: Question;
    message?: string;
  }> {
    // 1. Obtener sesión para validar
    const session = await this.repository.getById(interviewId);

    if (!session) {
      throw new InterviewNotFoundError(interviewId);
    }

    // 2. Validar que se puede resumir
    if (!session.isResumable()) {
      throw new CannotResumeError("Interview cannot be resumed");
    }

    // 3. Actualizar heartbeat
    session.updateHeartbeat();
    await this.repository.save(session);

    // 4. Usar next() para transicionar
    const result = await this.next(interviewId, InterviewEvent.RESUME);

    return {
      state: result.state,
      screen: result.screen,
      question: result.payload?.question,
      message: "Welcome back! Let's continue where we left off.",
    };
  }

  /**
   * Obtiene el resumen final
   */
  async getSummary(interviewId: string): Promise<any> {
    // 1. Obtener sesión
    const session = await this.repository.getById(interviewId);

    if (!session) {
      throw new InterviewNotFoundError(interviewId);
    }

    // 2. Verificar que entrevista está completada
    if (session.state !== InterviewState.COMPLETED) {
      const error: any = new Error("Interview not completed yet");
      error.code = "NOT_READY";
      throw error;
    }

    // 3. Construir resumen (por ahora mock)
    return {
      interviewId: session.id,
      overallScore: 4.2,
      categoryScores: [
        { category: "TECHNICAL", score: 4.5, weight: 0.4 },
        { category: "BEHAVIORAL", score: 4.0, weight: 0.3 },
        { category: "COMMUNICATION", score: 4.2, weight: 0.3 },
      ],
      strengths: [
        "Clear communication",
        "Strong technical knowledge",
        "Good problem-solving approach",
      ],
      improvements: [
        "Could provide more specific examples",
        "Consider time management in responses",
      ],
      standoutMoments: [],
      recommendations: [
        {
          title: "Continue developing leadership skills",
          description: "Consider taking on more team lead responsibilities",
          priority: "high" as const,
        },
      ],
      completedAt: session.completedAt,
      partial: false,
    };
  }

  /**
   * Obtiene la entrevista activa del usuario
   *
   * 📌 LÓGICA DE NEGOCIO:
   * - Repo retorna la entrevista activa (si existe)
   * - Valida si es resumible (no expirada)
   */
  async getActiveInterview(userId: string): Promise<{
    canResume: boolean;
    interview?: any;
  } | null> {
    // 1. Obtener entrevista activa del usuario (O(1) lookup)
    const session = await this.repository.getActiveByUserId(userId);

    // 2. Si no hay entrevista activa, retornar null
    if (!session) {
      return null;
    }

    // 3. Validar que sea resumible (lógica de negocio: no expirada)
    const canResume = session.isResumable() && !session.isExpired();

    return {
      canResume,
      interview: canResume
        ? {
            id: session.id,
            state: session.state,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.totalQuestions,
            lastHeartbeat: session.lastHeartbeat,
            progress: session.currentQuestionIndex / session.totalQuestions,
          }
        : undefined,
    };
  }

  /**
   * Actualiza el heartbeat de la sesión
   */
  async updateHeartbeat(interviewId: string): Promise<void> {
    // Delegar al repositorio (método especializado)
    await this.repository.updateHeartbeat(interviewId);
  }
}
