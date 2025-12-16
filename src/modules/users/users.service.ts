import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import type { SyncUserInput, UserResponse } from "./users.schema";

/**
 * Sincroniza un usuario de Clerk con nuestra base de datos
 * Es idempotente: si el usuario ya existe, lo actualiza
 */
export async function syncUser(input: SyncUserInput): Promise<UserResponse> {
  const now = new Date();

  // Verificar si el usuario ya existe
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.clerkUserId))
    .limit(1);

  if (existingUser) {
    // Actualizar usuario existente
    const [updatedUser] = await db
      .update(users)
      .set({
        email: input.email,
        name: input.name || null,
        imageUrl: input.imageUrl || null,
        plan: input.plan,
        updatedAt: now,
      })
      .where(eq(users.id, input.clerkUserId))
      .returning();

    return updatedUser as UserResponse;
  }

  // Crear nuevo usuario
  const [newUser] = await db
    .insert(users)
    .values({
      id: input.clerkUserId,
      email: input.email,
      name: input.name || null,
      imageUrl: input.imageUrl || null,
      plan: input.plan,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newUser as UserResponse;
}

/**
 * Obtiene un usuario por su ID
 */
export async function getUserById(
  userId: string
): Promise<UserResponse | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ? (user as UserResponse) : null;
}

/**
 * Obtiene un usuario por su email
 */
export async function getUserByEmail(
  email: string
): Promise<UserResponse | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ? (user as UserResponse) : null;
}

/**
 * Actualiza el plan de un usuario
 */
export async function updateUserPlan(
  userId: string,
  plan: string
): Promise<UserResponse> {
  const [updatedUser] = await db
    .update(users)
    .set({
      plan,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return updatedUser as UserResponse;
}
