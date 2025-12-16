import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

// Configuración del cliente con opciones mejoradas
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10, // Máximo de conexiones
  idle_timeout: 20,
  connect_timeout: 10,
  // Forzar IPv4 para evitar problemas con IPv6
  ssl: "require",
});

export const db = drizzle(queryClient, { schema });

// Para cerrar la conexión cuando sea necesario
export const closeConnection = async () => {
  await queryClient.end();
};
