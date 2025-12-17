/**
 * HTTP Integration Tests
 * Tests de flujo completo usando fastify.inject()
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import { strict as assert } from "node:assert";
import Fastify, { FastifyInstance } from "fastify";
import app from "../../../app";

async function buildApp() {
  const fastify = Fastify({ logger: false });
  await fastify.register(app);
  await fastify.ready();
  return fastify;
}

describe("HTTP Integration Tests", () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await buildApp();
  });

  afterEach(async () => {
    await server.close();
  });

  test("Flow completo: start → answer → feedback → continue", async () => {
    // Start
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    assert.equal(start.statusCode, 201);
    const startBody = JSON.parse(start.body);
    assert.ok(startBody.interviewId);
    // El orchestrator transite automáticamente de INTRO → QUESTION en startInterview
    assert.ok(
      ["INTRO", "QUESTION"].includes(startBody.state),
      `State should be INTRO or QUESTION, got ${startBody.state}`
    );
    assert.ok(startBody.screen, "Should have screen field");

    const id = startBody.interviewId;

    // Answer
    const answer = await server.inject({
      method: "POST",
      url: `/interviews/${id}/answer`,
      payload: { audioUrl: "https://example.com/audio.mp3", durationMs: 45000 },
    });

    assert.equal(answer.statusCode, 200);
    const answerBody = JSON.parse(answer.body);
    assert.equal(answerBody.state, "MICRO_FEEDBACK");
    assert.equal(answerBody.screen, "MicroFeedbackScreen");

    // Continue
    const cont = await server.inject({
      method: "POST",
      url: `/interviews/${id}/continue`,
    });

    assert.equal(cont.statusCode, 200);
    const contBody = JSON.parse(cont.body);
    assert.equal(contBody.state, "QUESTION");
    assert.equal(contBody.screen, "QuestionScreen");
  });

  test("Flow: pause → resume", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Pause
    const pause = await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    assert.equal(pause.statusCode, 200);

    // Resume
    const resume = await server.inject({
      method: "POST",
      url: `/interviews/${id}/resume`,
    });

    assert.equal(resume.statusCode, 200);
    const resumeBody = JSON.parse(resume.body);
    assert.equal(resumeBody.state, "QUESTION");
    assert.equal(resumeBody.screen, "QuestionScreen");
  });

  test("Error: invalid transition → 400", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Ahora que ya está en QUESTION después de start, intentar pause y luego continue desde PAUSED sin resume
    await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    // Intentar continue desde PAUSED (inválido - debe usar resume)
    const invalid = await server.inject({
      method: "POST",
      url: `/interviews/${id}/continue`,
    });

    assert.equal(invalid.statusCode, 400);
    const errorBody = JSON.parse(invalid.body);
    assert.equal(errorBody.error, "InvalidTransition");
  });

  test("Error: interview not found → 404", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/interviews/non-existent/state",
    });

    assert.equal(response.statusCode, 404);
    const errorBody = JSON.parse(response.body);
    assert.equal(errorBody.error, "NotFound");
  });

  test("Validación: screen field en todas las respuestas", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const startBody = JSON.parse(start.body);
    assert.ok(startBody.screen);
    assert.equal(typeof startBody.screen, "string");

    const id = startBody.interviewId;

    const answer = await server.inject({
      method: "POST",
      url: `/interviews/${id}/answer`,
      payload: { audioUrl: "https://example.com/audio.mp3", durationMs: 45000 },
    });

    const answerBody = JSON.parse(answer.body);
    assert.ok(answerBody.screen);
  });

  test("Validación: Controller no tiene lógica de negocio", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Pause y luego intentar continue (inválido)
    await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    const invalid = await server.inject({
      method: "POST",
      url: `/interviews/${id}/continue`,
    });

    // El error debe venir del dominio (StateManager), no del controller
    assert.equal(invalid.statusCode, 400);
    const errorBody = JSON.parse(invalid.body);
    assert.ok(errorBody.message);
    // El controller solo tradujo el error del dominio a HTTP
  });

  test("Idempotencia: llamar /state múltiples veces", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Llamar /state múltiples veces debe retornar lo mismo
    const state1 = await server.inject({
      method: "GET",
      url: `/interviews/${id}/state`,
    });

    const state2 = await server.inject({
      method: "GET",
      url: `/interviews/${id}/state`,
    });

    const state3 = await server.inject({
      method: "GET",
      url: `/interviews/${id}/state`,
    });

    assert.equal(state1.statusCode, 200);
    assert.equal(state2.statusCode, 200);
    assert.equal(state3.statusCode, 200);

    const body1 = JSON.parse(state1.body);
    const body2 = JSON.parse(state2.body);
    const body3 = JSON.parse(state3.body);

    // Mismo estado
    assert.equal(body1.state, body2.state);
    assert.equal(body2.state, body3.state);
    // Mismo screen
    assert.equal(body1.screen, body2.screen);
    assert.equal(body2.screen, body3.screen);
  });

  test("Idempotencia: continue cuando no corresponde", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Intentar continue desde QUESTION (inválido - continue es solo para MICRO_FEEDBACK/CHECKPOINT)
    const invalid1 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/continue`,
    });

    const invalid2 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/continue`,
    });

    // Ambas llamadas deben fallar igual
    assert.equal(invalid1.statusCode, 400);
    assert.equal(invalid2.statusCode, 400);

    const error1 = JSON.parse(invalid1.body);
    const error2 = JSON.parse(invalid2.body);

    assert.equal(error1.error, "InvalidTransition");
    assert.equal(error2.error, "InvalidTransition");
  });

  test("Idempotencia: pause múltiples veces", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Primera pausa - debe funcionar
    const pause1 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    assert.equal(pause1.statusCode, 200);

    // Segunda pausa - debe fallar (ya está pausado)
    const pause2 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    assert.equal(pause2.statusCode, 400);
    const error = JSON.parse(pause2.body);
    assert.equal(error.error, "InvalidTransition");
  });

  test("Idempotencia: resume múltiples veces", async () => {
    const start = await server.inject({
      method: "POST",
      url: "/interviews/start",
      payload: { roleId: "senior-backend-engineer" },
    });

    const id = JSON.parse(start.body).interviewId;

    // Pausar primero
    await server.inject({
      method: "POST",
      url: `/interviews/${id}/pause`,
    });

    // Primera resume - debe funcionar
    const resume1 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/resume`,
    });

    assert.equal(resume1.statusCode, 200);

    // Segunda resume - debe fallar (ya está activo)
    const resume2 = await server.inject({
      method: "POST",
      url: `/interviews/${id}/resume`,
    });

    assert.equal(resume2.statusCode, 400);
    const error = JSON.parse(resume2.body);
    assert.equal(error.error, "InvalidTransition");
  });
});
