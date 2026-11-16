import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.js';
import { getEnv } from '../lib/env.js';

let pool: Pool | null = null;

export function getDb() {
  const env = getEnv();
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL });
  }
  return drizzle(pool, { schema });
}

export { schema };
