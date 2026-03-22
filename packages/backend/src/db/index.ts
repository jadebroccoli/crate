import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 'file:./crate.db';
const client = createClient({ url: dbUrl });

export const db = drizzle(client, { schema });
export { schema };

export async function runMigrations() {
  // Support override for bundled desktop builds where __dirname differs
  const migrationsFolder = process.env.MIGRATIONS_PATH || join(__dirname, '..', 'db', 'migrations');
  await migrate(db, { migrationsFolder });
  console.log('Database migrations applied');
}
