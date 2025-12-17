import { z } from "zod";

// Schema para sincronizar usuario
export const syncUserSchema = z.object({
  clerkUserId: z.string().min(1, "Clerk user ID is required"),
  email: z.string().email("Invalid email format"),
  name: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;

// Schema para respuesta de usuario
export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
