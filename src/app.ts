import Fastify from "fastify";
import { producerRoutes } from "./modules/producers/producer.routes";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "Up!" };
  });

  app.register(producerRoutes);

  return app;
}
