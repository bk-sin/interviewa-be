/**
 * Adaptation Engine Service
 * Decide qué sigue: siguiente pregunta, checkpoint o completar
 *
 * 📌 IMPORTANTE - Semántica de índices:
 * - questionIndex es 0-based (primer pregunta = 0)
 * - Se evalúa DESPUÉS del feedback, ANTES de incrementar el índice
 * - Checkpoint cada 5 respuestas: índices 4, 9, 14, etc. (preguntas 5, 10, 15)
 * - Ejemplo: después de responder pregunta 5 (index=4), decide CHECKPOINT
 */

interface AdaptationContext {
  questionIndex: number; // 0-based, representa la pregunta que acaba de ser respondida
  totalQuestions: number;
  feedback?: any;
  confidenceTrend?: number;
}

type NextAction = "NEXT_QUESTION" | "CHECKPOINT" | "COMPLETE";

interface AdaptationDecision {
  action: NextAction;
  reason: string;
  confidence: number;
}

export class AdaptationEngine {
  /**
   * Decide la siguiente acción basado en el contexto
   */
  decide(context: AdaptationContext): AdaptationDecision {
    const { questionIndex, totalQuestions, feedback } = context;

    // Regla 1: Si llegamos al final, completar
    // questionIndex es 0-based, entonces index=9 con total=10 significa última pregunta
    if (questionIndex >= totalQuestions - 1) {
      return {
        action: "COMPLETE",
        reason: "All questions completed",
        confidence: 1.0,
      };
    }

    // Regla 2: Checkpoint cada 5 preguntas
    // questionIndex es 0-based: 4,9,14... representan preguntas 5,10,15...
    // (questionIndex + 1) convierte a 1-based para evaluar múltiplos de 5
    const answeredQuestions = questionIndex + 1;
    if (questionIndex > 0 && answeredQuestions % 5 === 0) {
      return {
        action: "CHECKPOINT",
        reason: `Periodic checkpoint (after question ${answeredQuestions})`,
        confidence: 0.9,
      };
    }

    // Regla 3: Checkpoint si hay múltiples respuestas con score bajo
    if (feedback?.score && feedback.score < 3) {
      // TODO: Implementar tracking de scores bajos consecutivos
      // Por ahora solo continuamos
    }

    // Por defecto: siguiente pregunta
    return {
      action: "NEXT_QUESTION",
      reason: "Continue to next question",
      confidence: 0.95,
    };
  }

  /**
   * Evalúa si se debe activar un checkpoint
   */
  shouldActivateCheckpoint(context: AdaptationContext): boolean {
    const decision = this.decide(context);
    return decision.action === "CHECKPOINT";
  }

  /**
   * Evalúa si la entrevista debe completarse
   */
  shouldComplete(context: AdaptationContext): boolean {
    const decision = this.decide(context);
    return decision.action === "COMPLETE";
  }
}
