import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { mkdirSync } from "fs";
import path from "path";

const configuredPath = process.env.DATABASE_URL ?? "./data/med.db";
const dbPath = path.resolve(/* turbopackIgnore: true */ configuredPath);

mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

// Zero-config bootstrap: a new local file or an empty persistent Volume
// is ready to use on the first request without a separate migration command.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    specialty TEXT,
    department TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    gender TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    insurance_number TEXT,
    diagnosis TEXT,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patient_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    editable_content TEXT,
    conversion_warnings TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS patients_doctor_idx ON patients(doctor_id);
  CREATE INDEX IF NOT EXISTS documents_patient_idx ON documents(patient_id);
  CREATE INDEX IF NOT EXISTS patient_files_patient_idx ON patient_files(patient_id);
  CREATE INDEX IF NOT EXISTS patient_files_doctor_idx ON patient_files(doctor_id);
`);

export const db = drizzle(sqlite, { schema });
export { sqlite };
