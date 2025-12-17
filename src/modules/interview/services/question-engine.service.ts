/**
 * Question Engine Service
 * Selecciona y gestiona preguntas
 *
 * TODO (Configuración):
 * - totalQuestions debería ser configurable por rol/nivel
 * - Considerar InterviewConfig: { totalQuestions, timeLimit, difficulty, etc. }
 * - Por ahora usa el length del array MOCK_QUESTIONS (10 preguntas)
 */

import { Question } from "../domain/interview-session.entity";

// Mock de banco de preguntas
const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "¿Puedes contarme sobre tu experiencia más reciente en desarrollo de software?",
    category: "BEHAVIORAL",
    difficulty: "EASY",
    expectedSignals: ["experience", "achievements", "learnings"],
    estimatedDuration: 120,
  },
  {
    id: "q2",
    text: "¿Cuál fue el mayor desafío técnico que enfrentaste en tu último proyecto?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    expectedSignals: ["problem_solving", "technical_depth", "impact"],
    estimatedDuration: 150,
  },
  {
    id: "q3",
    text: "¿Cómo manejas situaciones de alta presión o deadlines ajustados?",
    category: "BEHAVIORAL",
    difficulty: "MEDIUM",
    expectedSignals: ["stress_management", "prioritization", "communication"],
    estimatedDuration: 120,
  },
  {
    id: "q4",
    text: "Describe un proyecto donde tuviste que aprender una tecnología nueva. ¿Cómo lo abordaste?",
    category: "PROBLEM_SOLVING",
    difficulty: "MEDIUM",
    expectedSignals: ["learning_ability", "initiative", "resourcefulness"],
    estimatedDuration: 150,
  },
  {
    id: "q5",
    text: "¿Qué herramientas y metodologías usas para garantizar la calidad del código?",
    category: "TECHNICAL",
    difficulty: "MEDIUM",
    expectedSignals: ["testing", "code_quality", "best_practices"],
    estimatedDuration: 120,
  },
  {
    id: "q6",
    text: "Cuéntame sobre una vez que tuviste que dar feedback constructivo a un compañero de equipo.",
    category: "COMMUNICATION",
    difficulty: "HARD",
    expectedSignals: ["empathy", "communication", "leadership"],
    estimatedDuration: 150,
  },
  {
    id: "q7",
    text: "¿Cómo priorizas tareas cuando tienes múltiples proyectos urgentes?",
    category: "PROBLEM_SOLVING",
    difficulty: "MEDIUM",
    expectedSignals: ["prioritization", "decision_making", "impact_awareness"],
    estimatedDuration: 120,
  },
  {
    id: "q8",
    text: "Describe tu experiencia con sistemas distribuidos o arquitecturas de microservicios.",
    category: "TECHNICAL",
    difficulty: "HARD",
    expectedSignals: ["scalability", "system_design", "trade_offs"],
    estimatedDuration: 180,
  },
  {
    id: "q9",
    text: "¿Qué te motiva a continuar creciendo como profesional?",
    category: "BEHAVIORAL",
    difficulty: "EASY",
    expectedSignals: ["motivation", "career_goals", "passion"],
    estimatedDuration: 120,
  },
  {
    id: "q10",
    text: "¿Tienes alguna pregunta para mí sobre la empresa o el rol?",
    category: "COMMUNICATION",
    difficulty: "EASY",
    expectedSignals: ["curiosity", "engagement", "preparation"],
    estimatedDuration: 120,
  },
];

export class QuestionEngine {
  /**
   * Obtiene una pregunta por índice
   */
  getQuestion(questionIndex: number): Question {
    if (questionIndex >= MOCK_QUESTIONS.length) {
      throw new Error("No more questions available");
    }

    return MOCK_QUESTIONS[questionIndex];
  }

  /**
   * Obtiene el número total de preguntas
   */
  getTotalQuestions(): number {
    return MOCK_QUESTIONS.length;
  }

  /**
   * Verifica si hay más preguntas
   */
  hasMoreQuestions(questionIndex: number): boolean {
    return questionIndex < MOCK_QUESTIONS.length;
  }

  /**
   * Selecciona siguiente pregunta (con lógica de adaptación)
   * Por ahora es secuencial, pero puede evolucionar
   */
  selectNext(context: {
    questionIndex: number;
    lastFeedback?: any;
    focusArea?: string;
  }): Question {
    return this.getQuestion(context.questionIndex);
  }
}
