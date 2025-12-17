import { InterviewEvent } from "./interview-events";
import { InterviewState } from "./interview-state";

export const INTERVIEW_STATE_TRANSITIONS: Record<
  InterviewState,
  Partial<Record<InterviewEvent, InterviewState>>
> = {
  [InterviewState.INTRO]: {
    [InterviewEvent.INTRO_DONE]: InterviewState.QUESTION,
  },

  [InterviewState.QUESTION]: {
    [InterviewEvent.START_RECORDING]: InterviewState.RECORDING,
    [InterviewEvent.COMPLETE_INTERVIEW]: InterviewState.COMPLETED,
    [InterviewEvent.PAUSE]: InterviewState.PAUSED,
  },

  [InterviewState.RECORDING]: {
    [InterviewEvent.ANSWER_SUBMITTED]: InterviewState.PROCESSING,
  },

  [InterviewState.PROCESSING]: {
    [InterviewEvent.PROCESSING_DONE]: InterviewState.MICRO_FEEDBACK,
  },

  [InterviewState.MICRO_FEEDBACK]: {
    [InterviewEvent.FEEDBACK_ACK]: InterviewState.QUESTION,
    [InterviewEvent.COMPLETE_INTERVIEW]: InterviewState.COMPLETED,
    [InterviewEvent.PAUSE]: InterviewState.PAUSED,
  },

  [InterviewState.CHECKPOINT]: {
    [InterviewEvent.CHECKPOINT_ACK]: InterviewState.QUESTION,
    [InterviewEvent.PAUSE]: InterviewState.PAUSED,
  },

  [InterviewState.COMPLETED]: {},

  [InterviewState.ERROR]: {},

  [InterviewState.PAUSED]: {
    [InterviewEvent.RESUME]: InterviewState.QUESTION,
  },
};
