import { FastifyInstance } from "fastify";
import { GetAwardsIntervalService } from "./services/get-awards-interval.service";

const getAwardsIntervalService = new GetAwardsIntervalService();

export async function producerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/producers/awards-interval", async () => {
    return getAwardsIntervalService.getAwardsInterval();
  });
}
