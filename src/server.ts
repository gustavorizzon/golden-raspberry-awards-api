import { buildApp } from "./app.js";
import { loadCsvData } from "./startup/csv-loader";

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  loadCsvData();

  const app = buildApp();

  await app.listen({ port: PORT, host: "0.0.0.0" });
}

start();
