import dotenv from 'dotenv';
dotenv.config();
import { getDb, schema } from '../src/db/index.js';
import { hashPassword } from '../src/lib/auth.js';
import { eq } from 'drizzle-orm';

async function setPassword() {
  const email = 'admin@kaids.in';
  const password = 'Admin@KAIDS2026!';
  const passwordHash = await hashPassword(password);

  const db = getDb();
  await db.update(schema.adminUsers)
    .set({
      password_hash: passwordHash,
      role: 'owner',
      failed_login_count: 0,
      locked_until: null,
      password_changed_at: new Date()
    })
    .where(eq(schema.adminUsers.email, email));

  console.log('Successfully set password for admin@kaids.in to: Admin@KAIDS2026!');
  process.exit(0);
}

setPassword().catch(console.error);
