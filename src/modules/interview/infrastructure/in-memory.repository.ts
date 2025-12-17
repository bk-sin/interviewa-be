/**
 * In-Memory Interview Repository
 * Simulador de persistencia real (NO es lógica de negocio)
 *
 * 🎯 Diseño con 2 Maps para O(1) lookups:
 * - interviewsById: acceso rápido por ID
 * - activeInterviewByUser: una entrevista activa por usuario
 *
 * Garantiza:
 * ✅ Consistencia de estado
 * ✅ Búsqueda por ID en O(1)
 * ✅ Búsqueda de entrevista activa por usuario en O(1)
 * ✅ Una sola entrevista activa por usuario
 *
 * NO contiene:
 * ❌ Lógica de negocio
 * ❌ Validación de estados
 * ❌ Validación de transiciones
 * ❌ Expiración automática / TTL
 * ❌ Locking / Concurrencia
 */

import { InterviewSession } from "../domain/interview-session.entity";
import { InterviewState } from "../domain/interview-state";

export class InMemoryInterviewRepository {
  // Map 1: Todas las entrevistas por ID (búsqueda rápida)
  private interviewsById = new Map<string, InterviewSession>();

  // Map 2: Entrevista activa por usuario (garantiza unicidad)
  // userId → interviewId
  private activeInterviewByUser = new Map<string, string>();

  /**
   * Crea una nueva entrevista
   * Simula: INSERT INTO interviews
   *
   * Regla MVP: Si el usuario ya tiene una activa, la reemplaza
   */
  async create(session: InterviewSession): Promise<void> {
    // Guardar en map principal
    this.interviewsById.set(session.id, session);

    // Si no está completada, marcar como activa del usuario
    if (session.state !== InterviewState.COMPLETED) {
      this.activeInterviewByUser.set(session.userId, session.id);
    }
  }

  /**
   * Obtiene una entrevista por ID
   * Simula: SELECT * FROM interviews WHERE id = ?
   *
   * Retorna null si no existe (no lanza error)
   */
  async getById(id: string): Promise<InterviewSession | null> {
    const session = this.interviewsById.get(id);
    return session ?? null;
  }

  /**
   * Guarda cambios en una entrevista existente
   * Simula: UPDATE interviews SET ... WHERE id = ?
   *
   * Actualiza automáticamente updatedAt (simula DB trigger)
   */
  async save(session: InterviewSession): Promise<void> {
    // Actualizar timestamp (simula DB trigger)
    session.updatedAt = new Date();

    // Guardar en map principal
    this.interviewsById.set(session.id, session);

    // Actualizar índice de entrevistas activas
    if (session.state === InterviewState.COMPLETED) {
      // Si se completó, remover de activas
      this.activeInterviewByUser.delete(session.userId);
    } else {
      // Si sigue activa, mantener/actualizar referencia
      this.activeInterviewByUser.set(session.userId, session.id);
    }
  }

  /**
   * Obtiene la entrevista activa de un usuario (O(1))
   * Simula: SELECT * FROM interviews WHERE user_id = ? AND state != 'COMPLETED'
   *
   * Retorna null si no tiene entrevista activa
   */
  async getActiveByUserId(userId: string): Promise<InterviewSession | null> {
    const activeInterviewId = this.activeInterviewByUser.get(userId);

    if (!activeInterviewId) {
      return null;
    }

    return this.getById(activeInterviewId);
  }

  /**
   * Actualiza el heartbeat de una entrevista
   * Simula: UPDATE interviews SET last_heartbeat_at = NOW() WHERE id = ?
   */
  async updateHeartbeat(id: string): Promise<void> {
    const session = await this.getById(id);

    if (!session) {
      throw new InterviewNotFoundError(id);
    }

    session.lastHeartbeat = new Date();
    // No llamar a save() para evitar actualizar updatedAt
    // Solo actualizamos lastHeartbeat sin side effects
  }

  /**
   * Marca una entrevista como completada
   * Simula: UPDATE interviews SET state = 'COMPLETED' WHERE id = ?
   *
   * Remueve de activeInterviewByUser automáticamente
   */
  async complete(id: string): Promise<void> {
    const session = await this.getById(id);

    if (!session) {
      throw new InterviewNotFoundError(id);
    }

    session.state = InterviewState.COMPLETED;
    session.completedAt = new Date();

    // Remover de entrevistas activas
    this.activeInterviewByUser.delete(session.userId);

    // Persistir cambios
    await this.save(session);
  }

  /**
   * Elimina una entrevista (solo para testing)
   * Simula: DELETE FROM interviews WHERE id = ?
   */
  async delete(id: string): Promise<void> {
    const session = await this.getById(id);

    if (session) {
      this.interviewsById.delete(id);
      // Limpiar de activas si corresponde
      if (this.activeInterviewByUser.get(session.userId) === id) {
        this.activeInterviewByUser.delete(session.userId);
      }
    }
  }

  /**
   * Limpia todas las entrevistas (solo para testing)
   * Simula: TRUNCATE TABLE interviews
   */
  async clear(): Promise<void> {
    this.interviewsById.clear();
    this.activeInterviewByUser.clear();
  }
}

export class InterviewNotFoundError extends Error {
  code = "NOT_FOUND";

  constructor(sessionId: string) {
    super(`Interview session ${sessionId} not found`);
    this.name = "InterviewNotFoundError";
  }
}
