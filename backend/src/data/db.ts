import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

export const ensureDb = () => {
  const directory = path.dirname(env.DB_PATH);
  fs.mkdirSync(directory, { recursive: true });

  const db = new Database(env.DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL UNIQUE,
      display_name TEXT,
      pip REAL NOT NULL DEFAULT 0.01,
      decimals INTEGER NOT NULL DEFAULT 2,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ticks (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      epoch_ms INTEGER NOT NULL,
      price REAL NOT NULL,
      digit INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'history',
      raw TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ticks_symbol_epoch ON ticks(symbol, epoch_ms);

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      window_size INTEGER NOT NULL,
      model_name TEXT NOT NULL,
      predicted_digit INTEGER NOT NULL,
      observed_digit INTEGER,
      probability_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_predictions_symbol_time ON predictions(symbol, created_at);
  `);

  return db;
};

export const db = ensureDb();
