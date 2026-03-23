import Database from "better-sqlite3";

let db: Database.Database;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    createTables();
  }
  return db;
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      title TEXT NOT NULL,
      studios TEXT NOT NULL,
      producers TEXT NOT NULL,
      winner TEXT
    )
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined as any;
  }
}
