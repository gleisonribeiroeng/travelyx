import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import pg from 'pg';

async function ensureColumns() {
  const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`
    );
    const existing = new Set(rows.map((r: any) => r.column_name));
    console.log('[DB-FIX] Existing User columns:', [...existing].join(', '));

    const { rows: enums } = await client.query(
      `SELECT typname FROM pg_type WHERE typname IN ('Role', 'Plan')`
    );
    const existingEnums = new Set(enums.map((r: any) => r.typname));

    if (!existingEnums.has('Role')) {
      await client.query(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN')`);
      console.log('[DB-FIX] Created Role enum');
    }
    if (!existing.has('role')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER'`);
      await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'gleison423200@gmail.com'`);
      console.log('[DB-FIX] Created role column');
    }
    if (!existing.has('isActive')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`);
      console.log('[DB-FIX] Created isActive column');
    }
    if (!existingEnums.has('Plan')) {
      await client.query(`CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS')`);
      console.log('[DB-FIX] Created Plan enum');
    }
    if (!existing.has('plan')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE'`);
      console.log('[DB-FIX] Created plan column');
    }
    if (!existing.has('planExpiresAt')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3)`);
      console.log('[DB-FIX] Created planExpiresAt column');
    }

    console.log('[DB-FIX] Schema OK');
  } catch (e: any) {
    console.error('[DB-FIX] ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function bootstrap() {
  await ensureColumns();
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  app.enableCors({ origin: frontendUrl });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
