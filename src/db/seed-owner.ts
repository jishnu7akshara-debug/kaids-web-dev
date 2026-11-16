import crypto from 'node:crypto';
import { getDb, schema } from './index.js';
import { hashPassword } from '../lib/auth.js';
import { eq } from 'drizzle-orm';

async function seedOwner() {
  const args = process.argv.slice(2);
  let email = 'owner@kaids.in';
  let name = 'KAIDS Owner';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) email = args[i + 1].toLowerCase().trim();
    if (args[i] === '--name' && args[i + 1]) name = args[i + 1].trim();
  }

  const tempPassword = crypto.randomBytes(12).toString('base64url') + '!A1';
  const passwordHash = await hashPassword(tempPassword);

  console.log(`[SEED] Initialising Owner account for: ${email} (${name})`);

  try {
    const db = getDb();
    const existing = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email));

    if (existing.length > 0) {
      await db.update(schema.adminUsers)
        .set({
          password_hash: passwordHash,
          role: 'owner',
          failed_login_count: 0,
          locked_until: null,
          password_changed_at: null
        })
        .where(eq(schema.adminUsers.email, email));
      console.log(`[SEED] Existing account updated to Owner.`);
    } else {
      await db.insert(schema.adminUsers).values({
        email,
        name,
        role: 'owner',
        password_hash: passwordHash
      });
      console.log(`[SEED] New Owner created successfully.`);
    }

    console.log('============================================================');
    console.log(`TEMPORARY OWNER PASSWORD: ${tempPassword}`);
    console.log('Store this securely. You will be required to change it upon first login.');
    console.log('============================================================');
  } catch (err) {
    console.error('[SEED ERROR] Failed to seed owner:', err);
    process.exit(1);
  }
}

seedOwner().then(() => process.exit(0));
