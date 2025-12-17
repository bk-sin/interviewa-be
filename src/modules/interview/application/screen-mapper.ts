/**
 * Screen Mapper
 * Mapea estados de la entrevista a pantallas del frontend
 */

import { InterviewState } from "../domain/interview-state";

export type Screen =
  | "InterviewIntroScreen"
  | "QuestionScreen"
  | "RecordingScreen"
  | "ProcessingScreen"
  | "MicroFeedbackScreen"
  | "CheckpointScreen"
  | "InterviewSummaryScreen"
  | "ErrorScreen"
  | "PausedScreen";

/**
 * Mapea un estado de entrevista a la pantalla correspondiente
 */
export function mapStateToScreen(state: InterviewState): Screen {
  switch (state) {
    case InterviewState.INTRO:
      return "InterviewIntroScreen";

    case InterviewState.QUESTION:
      return "QuestionScreen";

    case InterviewState.RECORDING:
      return "RecordingScreen";

    case InterviewState.PROCESSING:
      return "ProcessingScreen";

    case InterviewState.MICRO_FEEDBACK:
      return "MicroFeedbackScreen";

    case InterviewState.CHECKPOINT:
      return "CheckpointScreen";

    case InterviewState.COMPLETED:
      return "InterviewSummaryScreen";

    case InterviewState.ERROR:
      return "ErrorScreen";

    case InterviewState.PAUSED:
      return "PausedScreen";

    default:
      return "ErrorScreen";
  }
}
