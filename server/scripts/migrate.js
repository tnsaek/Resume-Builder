import { pool, runMigrations } from '../src/db.js';

try {
  await runMigrations();
  console.log('Database migrations complete.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
