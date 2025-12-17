/**
 * Interview Session Entity
 * Representa el estado completo de una sesión de entrevista
 */

import { InterviewState } from "./interview-state";

export interface InterviewSession {
  id: string;
  userId: string;
  roleId: string;

  // Estado actual
  state: InterviewState;
  previousState: InterviewState | null;

  // Progreso
  currentQuestionIndex: number;
  askedQuestions: string[];
  totalQuestions: number;

  // Feedback y análisis
  lastFeedback: Feedback | null;
  confidenceTrend: number; // -1 a 1

  // Historial
  checkpointHistory: Checkpoint[];
  answers: Answer[];

  // Metadata
  blueprintId: string;
  createdAt: Date;
  updatedAt: Date;
  lastHeartbeat: Date;
  completedAt: Date | null;
}

export interface Answer {
  id: string;
  interviewId: string;
  questionId: string;
  audioUrl: string;
  durationMs: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  transcription?: string;
  metrics?: ResponseMetrics;
  createdAt: Date;
}

export interface Feedback {
  id: string;
  answerId: string;
  message: string;
  score: number; // 1-5
  strengths: string[];
  improvements: string[];
  flags: FeedbackFlag[];
  partial: boolean;
  refinementScheduled: boolean;
  createdAt: Date;
  refinedAt?: Date;
}

export type FeedbackFlag =
  | "TOO_SHORT"
  | "TOO_LONG"
  | "VAGUE"
  | "EXCELLENT"
  | "NEEDS_CLARIFICATION"
  | "OFF_TOPIC";

export interface ResponseMetrics {
  durationMs: number;
  silenceRatio: number;
  speechPace: number;
  energyLevel: number;
  wordCount?: number;
  technicalTerms?: string[];
}

export interface Checkpoint {
  id: string;
  interviewId: string;
  questionIndex: number;
  score: number;
  categoryBreakdown: CategoryScore[];
  message: string;
  insights: string[];
  createdAt: Date;
}

export interface CategoryScore {
  category: string;
  score: number;
  weight: number;
}

export interface Question {
  id: string;
  text: string;
  category: "TECHNICAL" | "BEHAVIORAL" | "PROBLEM_SOLVING" | "COMMUNICATION";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  expectedSignals: string[];
  estimatedDuration: number;
}

export interface StateTransition {
  id: string;
  interviewId: string;
  fromState: InterviewState;
  toState: InterviewState;
  payload?: any;
  timestamp: Date;
}

export class InterviewSession {
  constructor(
    public id: string,
    public userId: string,
    public roleId: string,
    public state: InterviewState = InterviewState.INTRO,
    public previousState: InterviewState | null = null,
    public currentQuestionIndex: number = 0, // 0-based: 0=pregunta 1, 4=pregunta 5, etc.
    public askedQuestions: string[] = [],
    public totalQuestions: number = 10,
    public lastFeedback: Feedback | null = null,
    public confidenceTrend: number = 0,
    public checkpointHistory: Checkpoint[] = [],
    public answers: Answer[] = [],
    public blueprintId: string = "",
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public lastHeartbeat: Date = new Date(),
    public completedAt: Date | null = null
  ) {}

  /**
   * Verifica si la sesión está activa
   */
  isActive(): boolean {
    const INACTIVE_STATES = [InterviewState.COMPLETED, InterviewState.ERROR];
    return !INACTIVE_STATES.includes(this.state);
  }

  /**
   * Verifica si la sesión es resumible
   */
  isResumable(): boolean {
    const RESUMABLE_STATES = [
      InterviewState.PAUSED,
      InterviewState.QUESTION,
      InterviewState.MICRO_FEEDBACK,
      InterviewState.CHECKPOINT,
    ];
    return RESUMABLE_STATES.includes(this.state);
  }

  /**
   * Verifica si la sesión expiró (24 horas de inactividad)
   */
  isExpired(): boolean {
    const EXPIRATION_HOURS = 24;
    const hoursSinceLastActivity =
      (Date.now() - this.lastHeartbeat.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastActivity > EXPIRATION_HOURS;
  }

  /**
   * Actualiza el heartbeat
   */
  updateHeartbeat(): void {
    this.lastHeartbeat = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Transiciona a un nuevo estado
   */
  transition(newState: InterviewState): void {
    this.previousState = this.state;
    this.state = newState;
    this.updatedAt = new Date();
  }

  /**
   * Agrega una respuesta
   */
  addAnswer(answer: Answer): void {
    this.answers.push(answer);
    this.updatedAt = new Date();
  }

  /**
   * Actualiza el feedback
   */
  updateFeedback(feedback: Feedback): void {
    this.lastFeedback = feedback;
    this.updatedAt = new Date();
  }

  /**
   * Agrega un checkpoint
   */
  addCheckpoint(checkpoint: Checkpoint): void {
    this.checkpointHistory.push(checkpoint);
    this.updatedAt = new Date();
  }

  /**
   * Marca como completada
   */
  complete(): void {
    this.state = InterviewState.COMPLETED;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }
}
