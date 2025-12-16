import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { db } from "../db";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate("db", db);

  fastify.log.info("✅ Database plugin registered");
};

export default fp(dbPlugin, {
  name: "db-plugin",
});
