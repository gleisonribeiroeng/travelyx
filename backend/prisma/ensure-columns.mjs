import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('[DB-FIX] Connecting to database...');
  const client = await pool.connect();
  try {
    // Check column types
    const { rows: cols } = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'User'
    `);
    console.log('[DB-FIX] Current columns:');
    for (const c of cols) {
      console.log(`  ${c.column_name}: ${c.data_type} (${c.udt_name})`);
    }

    const colMap = {};
    for (const c of cols) {
      colMap[c.column_name] = c.udt_name;
    }

    // Convert 'role' column from enum to TEXT if needed
    if (colMap['role'] === 'Role') {
      await client.query(`ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT`);
      await client.query(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'`);
      console.log('[DB-FIX] Converted role from enum to TEXT');
    }

    // Convert 'plan' column from enum to TEXT if needed
    if (colMap['plan'] === 'Plan') {
      await client.query(`ALTER TABLE "User" ALTER COLUMN "plan" TYPE TEXT USING "plan"::TEXT`);
      await client.query(`ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'FREE'`);
      console.log('[DB-FIX] Converted plan from enum to TEXT');
    }

    // Ensure columns exist (if missing entirely)
    if (!colMap['role']) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER'`);
      await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'gleison423200@gmail.com'`);
      console.log('[DB-FIX] Created role column');
    }
    if (!colMap['isActive']) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`);
      console.log('[DB-FIX] Created isActive column');
    }
    if (!colMap['plan']) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE'`);
      console.log('[DB-FIX] Created plan column');
    }
    if (!colMap['planExpiresAt']) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3)`);
      console.log('[DB-FIX] Created planExpiresAt column');
    }

    // Drop old enum types (no longer needed)
    await client.query(`DROP TYPE IF EXISTS "Plan" CASCADE`);
    await client.query(`DROP TYPE IF EXISTS "Role" CASCADE`);
    console.log('[DB-FIX] Dropped old enum types');

    console.log('[DB-FIX] All done!');
  } catch (e) {
    console.error('[DB-FIX] ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
