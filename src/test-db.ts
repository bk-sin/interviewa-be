import { db, closeConnection } from "./db";
import { users } from "./db/schema";
import { sql } from "drizzle-orm";

async function testConnection() {
  try {
    console.log("🔌 Probando conexión a la base de datos...\n");

    // Test 1: Verificar conexión básica
    console.log("1️⃣ Test de conexión básica...");
    const result = await db.execute(
      sql`SELECT NOW() as current_time, version() as pg_version`
    );
    console.log("✅ Conexión exitosa!");
    console.log("📅 Hora del servidor:", result[0].current_time);
    console.log("🗄️  Versión PostgreSQL:", result[0].pg_version);
    console.log("");

    // Test 2: Verificar si la tabla users existe
    console.log("2️⃣ Verificando tablas existentes...");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("📋 Tablas encontradas:", tables.length);
    tables.forEach((table: any) => {
      console.log("   -", table.table_name);
    });
    console.log("");

    // Test 3: Intentar hacer una query simple a users (si existe)
    console.log("3️⃣ Probando query a tabla users...");
    try {
      const usersCount = await db.select().from(users);
      console.log("✅ Query exitosa! Usuarios encontrados:", usersCount.length);
    } catch (error: any) {
      console.log('⚠️  La tabla "users" aún no existe.');
      console.log('💡 Ejecuta "npm run db:push" para crear las tablas.');
    }

    console.log("\n✨ Tests completados!");
  } catch (error) {
    console.error("❌ Error al conectar con la base de datos:");
    console.error(error);
    process.exit(1);
  } finally {
    await closeConnection();
    process.exit(0);
  }
}

testConnection();
