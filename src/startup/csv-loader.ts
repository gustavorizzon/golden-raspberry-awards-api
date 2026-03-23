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

const REQUIRED_COLUMNS = ["year", "title", "studios", "producers", "winner"];

function validateRow(row: CsvRow, index: number) {
  const valid = () => ({ valid: true }) as const;
  const invalid = (reason: string) => ({ valid: false, reason }) as const;

  const year = Number(row.year);

  if (!row.year || isNaN(year) || year <= 0) {
    return invalid(`Linha ${index + 1}: 'year' inválido ("${row.year}")`);
  }

  if (!row.title || row.title.trim().length === 0) {
    return invalid(`Linha ${index + 1}: 'title' está vazio`);
  }

  if (!row.studios || row.studios.trim().length === 0) {
    return invalid(`Linha ${index + 1}: 'studios' está vazio`);
  }

  if (!row.producers || row.producers.trim().length === 0) {
    return invalid(`Linha ${index + 1}: 'producers' está vazio`);
  }

  return valid();
}

function validateColumns(records: CsvRow[]): void {
  if (records.length === 0) return;

  const columns = Object.keys(records[0]!);
  const missing = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));

  if (missing.length > 0) {
    throw new Error(
      `[CSV] Colunas obrigatórias ausentes: ${missing.join(", ")}. ` +
        `Esperado: ${REQUIRED_COLUMNS.join(";")}`,
    );
  }
}

export function loadCsvData(filePath?: string): void {
  const csvPath =
    filePath || path.resolve(__dirname, "..", "input", "movielist.csv");

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `[CSV] Arquivo não encontrado: ${csvPath}. ` +
        `Certifique-se de que o arquivo CSV está em ${csvPath} ou forneça o caminho correto.`,
    );
  }

  console.log(`[+] Carregando dados do CSV: ${csvPath}`);

  const fileContent = fs.readFileSync(csvPath, "utf-8");

  const records: CsvRow[] = parse(fileContent, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
  });

  validateColumns(records);

  const db = getDatabase();

  const insert = db.prepare(
    "INSERT INTO movies (year, title, studios, producers, winner) VALUES (?, ?, ?, ?, ?)",
  );

  let loaded = 0;
  let skipped = 0;

  const insertMany = db.transaction((rows: CsvRow[]) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const validation = validateRow(row, i);

      if (!validation.valid) {
        console.warn(`[!] Registro ignorado — ${validation.reason}`);
        skipped++;
        continue;
      }

      insert.run(
        Number(row.year),
        row.title,
        row.studios,
        row.producers,
        row.winner?.toLowerCase().trim() === "yes" ? "yes" : null,
      );
      loaded++;
    }
  });

  insertMany(records);

  console.log(
    `[+] CSV carregado com sucesso: ${loaded} registros inseridos` +
      (skipped > 0 ? `, ${skipped} ignorados` : ""),
  );
}
