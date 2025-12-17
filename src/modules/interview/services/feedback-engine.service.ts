/**
 * Feedback Engine Service
 * Genera feedback (mock por ahora, luego con IA)
 */

interface FeedbackInput {
  answerDuration: number;
  audioUrl?: string;
  transcription?: string;
}

interface Feedback {
  message: string;
  score: number;
  strengths: string[];
  improvements: string[];
  flags: string[];
  partial: boolean;
}

export class FeedbackEngine {
  /**
   * Genera feedback mock basado en métricas básicas
   */
  generateMockFeedback(answerDuration: number): Feedback {
    // Heurísticas simples
    const isShort = answerDuration < 30000; // < 30 segundos
    const isLong = answerDuration > 300000; // > 5 minutos
    const isOptimal = answerDuration >= 60000 && answerDuration <= 180000; // 1-3 min

    let score = 3; // neutral
    const strengths: string[] = [];
    const improvements: string[] = [];
    const flags: string[] = [];

    if (isShort) {
      score = 2;
      improvements.push("Try to elaborate more on your answer");
      improvements.push("Provide specific examples to illustrate your points");
      flags.push("TOO_SHORT");
    } else if (isLong) {
      score = 3;
      improvements.push("Try to be more concise");
      improvements.push("Focus on the most relevant points");
      flags.push("TOO_LONG");
    } else if (isOptimal) {
      score = 4;
      strengths.push("Good answer length");
      strengths.push("Well-structured response");
    }

    // Mensaje general
    const messages = [
      "Good answer! Clear and well-articulated.",
      "Nice explanation! I appreciate the detail.",
      "Great response! You covered the key points.",
      "Solid answer! Good use of examples.",
      "Excellent! Very comprehensive response.",
    ];

    const message = messages[Math.min(score - 1, messages.length - 1)];

    return {
      message,
      score,
      strengths,
      improvements,
      flags,
      partial: true, // Por ahora siempre es partial (mock)
    };
  }

  /**
   * Genera feedback completo (placeholder para IA)
   */
  async generateFullFeedback(input: FeedbackInput): Promise<Feedback> {
    // TODO: Integrar con OpenAI u otro servicio
    // Por ahora retorna mock
    return this.generateMockFeedback(input.answerDuration);
  }
}
