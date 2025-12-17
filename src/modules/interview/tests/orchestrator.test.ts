/**
 * Interview Orchestrator Tests
 * Tests básicos para el flujo de entrevistas
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { InterviewOrchestrator } from "../application/interview-orchestrator";
import { InterviewState } from "../domain/interview-state";

const userId = "test-user-id";
const roleId = "test-role-id";

test("InterviewOrchestrator - startInterview", async () => {
  const orchestrator = new InterviewOrchestrator();
  const result = await orchestrator.startInterview(userId, roleId);

  assert.ok(result.id, "Interview ID should be defined");
  assert.strictEqual(result.state, InterviewState.QUESTION);
  assert.ok(result.currentQuestion, "Current question should be defined");
  assert.ok(result.currentQuestion.text, "Question text should exist");

  // TODO: totalQuestions hardcodeado (10) debería venir de:
  // - QuestionEngine.getTotalQuestions(), o
  // - InterviewConfig mock inyectable
  assert.strictEqual(result.totalQuestions, 10);
});

test("InterviewOrchestrator - submitAnswer", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  const audioUrl = "https://example.com/audio.mp3";
  const durationMs = 90000;

  const result = await orchestrator.submitAnswer(
    interview.id,
    audioUrl,
    durationMs
  );

  assert.ok(result.answerId, "Answer ID should be defined");
  assert.ok(result.partialFeedback, "Partial feedback should be defined");
  assert.ok(result.partialFeedback.score >= 1, "Score should be >= 1");
  assert.ok(result.partialFeedback.score <= 5, "Score should be <= 5");
});

test("InterviewOrchestrator - getState", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  // submitAnswer ejecuta el fast-path completo (MVP):
  // QUESTION → RECORDING → PROCESSING → MICRO_FEEDBACK
  // En producción, esto sería asíncrono (upload, transcripción AI, feedback)
  await orchestrator.submitAnswer(interview.id, "audio.mp3", 90000);

  const state = await orchestrator.getState(interview.id);

  assert.strictEqual(state.state, InterviewState.MICRO_FEEDBACK);
  assert.strictEqual(state.screen, "MicroFeedbackScreen");
  assert.ok(state.payload, "Payload should exist");
});

test("InterviewOrchestrator - continue after feedback", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  await orchestrator.submitAnswer(interview.id, "audio.mp3", 90000);
  const result = await orchestrator.continue(interview.id);

  assert.strictEqual(result.state, InterviewState.QUESTION);
  assert.ok(result.question, "Question should be defined");
  assert.ok(result.question.text, "Question text should exist");
});

test("InterviewOrchestrator - pause and resume", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  // Pause
  await orchestrator.pause(interview.id);
  const pausedState = await orchestrator.getState(interview.id);
  assert.strictEqual(pausedState.state, InterviewState.PAUSED);

  // Resume
  const resumed = await orchestrator.resume(interview.id);
  assert.strictEqual(resumed.state, InterviewState.QUESTION);
  assert.ok(resumed.question, "Question should be defined after resume");
});

test("InterviewOrchestrator - getActiveInterview", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  const active = await orchestrator.getActiveInterview(userId);

  assert.ok(active, "Active interview should exist");
  assert.strictEqual(active?.canResume, true);
  assert.strictEqual(active?.interview?.id, interview.id);
});

test("InterviewOrchestrator - no active interview", async () => {
  const orchestrator = new InterviewOrchestrator();
  const active = await orchestrator.getActiveInterview("non-existent-user");

  assert.strictEqual(active, null);
});

test("InterviewOrchestrator - checkpoint after 5 questions", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  // 📌 ÍNDICES 0-BASED:
  // - currentQuestionIndex empieza en 0 (primera pregunta)
  // - Checkpoint se evalúa DESPUÉS del feedback, ANTES de incrementar
  // - submitAnswer() deja la sesión en MICRO_FEEDBACK
  // - continue() decide si va a CHECKPOINT o QUESTION

  // Responder 4 preguntas (índices 0-3)
  for (let i = 0; i < 4; i++) {
    await orchestrator.submitAnswer(interview.id, "audio.mp3", 90000);
    await orchestrator.continue(interview.id); // Avanza a siguiente pregunta
  }

  // La 5ta pregunta (índice 4)
  await orchestrator.submitAnswer(interview.id, "audio.mp3", 90000);
  // En este punto: questionIndex=4, answeredQuestions=5
  // AdaptationEngine.decide() detecta: 5 % 5 === 0 → CHECKPOINT
  const result = await orchestrator.continue(interview.id);

  // Debería activar checkpoint después de 5 respuestas
  assert.strictEqual(result.state, InterviewState.CHECKPOINT);
  assert.ok(result.checkpoint, "Checkpoint data should exist");
});

test("InterviewOrchestrator - complete interview", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  // Responder todas las preguntas
  for (let i = 0; i < 10; i++) {
    await orchestrator.submitAnswer(interview.id, "audio.mp3", 90000);

    const result = await orchestrator.continue(interview.id);

    // Si llegamos a COMPLETED, salir
    if (result.state === InterviewState.COMPLETED) {
      assert.strictEqual(result.state, InterviewState.COMPLETED);
      return;
    }

    // Si es checkpoint, continuar
    if (result.state === InterviewState.CHECKPOINT) {
      await orchestrator.continue(interview.id);
    }
  }
});

test("InterviewOrchestrator - updateHeartbeat", async () => {
  const orchestrator = new InterviewOrchestrator();
  const interview = await orchestrator.startInterview(userId, roleId);

  // No debería lanzar error
  await orchestrator.updateHeartbeat(interview.id);

  const active = await orchestrator.getActiveInterview(userId);
  assert.ok(active, "Interview should still be active after heartbeat");
});
