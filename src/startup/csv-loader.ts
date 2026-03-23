import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { getDatabase } from "../infra/database";

interface CsvRow {
  year: string;
  title: string;
  studios: string;
  producers: string;
  winner: string;
}

export function loadCsvData(filePath?: string): void {
  console.log("[+] Carregando dados do CSV...");

  const csvPath =
    filePath || path.resolve(__dirname, "..", "input", "movielist.csv");
  const fileContent = fs.readFileSync(csvPath, "utf-8");

  console.log("[+] Processando dados do CSV...");

  const records: CsvRow[] = parse(fileContent, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
  });

  const db = getDatabase();

  console.log("[+] Inserindo dados no banco de dados...");

  const insert = db.prepare(
    "INSERT INTO movies (year, title, studios, producers, winner) VALUES (?, ?, ?, ?, ?)",
  );

  const insertMany = db.transaction((rows: CsvRow[]) => {
    for (const row of rows) {
      insert.run(
        Number(row.year),
        row.title,
        row.studios,
        row.producers,
        row.winner?.toLowerCase().trim() === "yes" ? "yes" : null,
      );
    }
  });

  insertMany(records);

  console.log("[+] Dados do CSV carregados com sucesso!");
}
