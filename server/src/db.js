import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', 'migrations');

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ensureMigrationTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const getAppliedMigrations = async (client) => {
  const result = await client.query('SELECT version FROM schema_migrations');
  return new Set(result.rows.map((row) => row.version));
};

const loadMigrationFiles = async () => {
  const files = await fs.readdir(migrationsDir);
  return files.filter((file) => file.endsWith('.sql')).sort();
};

export const runMigrations = async () => {
  const client = await pool.connect();

  try {
    await ensureMigrationTable(client);
    const appliedMigrations = await getAppliedMigrations(client);
    const migrationFiles = await loadMigrationFiles();

    for (const file of migrationFiles) {
      if (appliedMigrations.has(file)) continue;

      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migration] applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }
  } finally {
    client.release();
  }
};

export const initDb = runMigrations;
