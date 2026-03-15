import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('[ENSURE-COLUMNS] Connecting to database...');
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`
    );
    const existing = new Set(rows.map(r => r.column_name));
    console.log('[ENSURE-COLUMNS] Existing columns:', [...existing].join(', '));

    const { rows: enums } = await client.query(
      `SELECT typname FROM pg_type WHERE typname IN ('Role', 'Plan')`
    );
    const existingEnums = new Set(enums.map(r => r.typname));
    console.log('[ENSURE-COLUMNS] Existing enums:', [...existingEnums].join(', '));

    if (!existingEnums.has('Role')) {
      await client.query(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN')`);
      console.log('[ENSURE-COLUMNS] Created Role enum');
    }
    if (!existing.has('role')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER'`);
      await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'gleison423200@gmail.com'`);
      console.log('[ENSURE-COLUMNS] Created role column');
    }
    if (!existing.has('isActive')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`);
      console.log('[ENSURE-COLUMNS] Created isActive column');
    }
    if (!existingEnums.has('Plan')) {
      await client.query(`CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS')`);
      console.log('[ENSURE-COLUMNS] Created Plan enum');
    }
    if (!existing.has('plan')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE'`);
      console.log('[ENSURE-COLUMNS] Created plan column');
    }
    if (!existing.has('planExpiresAt')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3)`);
      console.log('[ENSURE-COLUMNS] Created planExpiresAt column');
    }

    console.log('[ENSURE-COLUMNS] Done!');
  } catch (e) {
    console.error('[ENSURE-COLUMNS] ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
