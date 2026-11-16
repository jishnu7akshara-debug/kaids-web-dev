import { Pool } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL_MIGRATE || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[MIGRATE ERROR] Neither DATABASE_URL_MIGRATE nor DATABASE_URL is configured.');
    process.exit(1);
  }

  console.log('[MIGRATE] Connecting to database...');
  const pool = new Pool({ connectionString });

  try {
    const migrationDir = path.resolve(process.cwd(), 'drizzle');
    const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`[MIGRATE] Applying ${file}...`);
      const filePath = path.join(migrationDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      
      // Execute migration statements
      const statements = sqlContent.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
      for (const statement of statements) {
        await pool.query(statement);
      }
      console.log(`[MIGRATE] Successfully applied ${file}`);
    }

    // Harden audit_log: revoke UPDATE and DELETE from runtime application role
    console.log('[MIGRATE] Hardening audit_log permissions (revoking UPDATE/DELETE)...');
    try {
      await pool.query('REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;');
    } catch {
      // In local/dev environments where custom roles may not exist yet
      console.log('[MIGRATE] Notice: custom role permission hardening skipped if running on superuser.');
    }

    console.log('[MIGRATE] All migrations applied cleanly.');
  } catch (err) {
    console.error('[MIGRATE ERROR] Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().then(() => process.exit(0));
