/**
 * State Manager Service
 * Valida transiciones y maneja cambios de estado
 */

import { InterviewState } from "../domain/interview-state";
import { InterviewEvent } from "../domain/interview-events";
import { INTERVIEW_STATE_TRANSITIONS } from "../domain/interview-transitions";

/**
 * Matriz de transiciones válidas
 * Define qué eventos son válidos en cada estado
 */

export class StateManager {
  /**
   * Valida si una transición es permitida
   */
  canTransition(currentState: InterviewState, event: InterviewEvent): boolean {
    const validEvents = INTERVIEW_STATE_TRANSITIONS[currentState];
    return event in validEvents;
  }

  /**
   * Valida transición y lanza error si no es válida
   */
  assertTransition(currentState: InterviewState, event: InterviewEvent): void {
    if (!this.canTransition(currentState, event)) {
      throw new InvalidTransitionError(
        `Cannot transition from ${currentState} with event ${event}`
      );
    }
  }

  /**
   * Ejecuta la transición y retorna el nuevo estado
   */
  transition(
    currentState: InterviewState,
    event: InterviewEvent
  ): InterviewState {
    this.assertTransition(currentState, event);

    const validTransitions = INTERVIEW_STATE_TRANSITIONS[currentState];
    const nextState = validTransitions[event];

    if (!nextState) {
      throw new Error(`No next state defined for ${currentState} + ${event}`);
    }

    return nextState;
  }

  /**
   * Obtiene todas las transiciones válidas desde un estado
   */
  getValidEvents(currentState: InterviewState): InterviewEvent[] {
    const validEvents = INTERVIEW_STATE_TRANSITIONS[currentState];
    return Object.keys(validEvents) as InterviewEvent[];
  }
}

export class InvalidTransitionError extends Error {
  code = "INVALID_STATE";

  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}
