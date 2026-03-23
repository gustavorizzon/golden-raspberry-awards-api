import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const app = buildApp();

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
