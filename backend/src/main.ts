import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
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
    // DB-FIX: Existing User columns:', [...existing].join(', '));

    const { rows: enums } = await client.query(
      `SELECT typname FROM pg_type WHERE typname IN ('Role', 'Plan')`
    );
    const existingEnums = new Set(enums.map((r: any) => r.typname));

    if (!existingEnums.has('Role')) {
      await client.query(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN')`);
      // DB-FIX: Created Role enum');
    }
    if (!existing.has('role')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER'`);
      await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = $1`, [process.env.ADMIN_EMAIL || 'gleison423200@gmail.com']);
      // DB-FIX: Created role column');
    }
    if (!existing.has('isActive')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`);
      // DB-FIX: Created isActive column');
    }
    if (!existingEnums.has('Plan')) {
      await client.query(`CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS')`);
      // DB-FIX: Created Plan enum');
    }
    if (!existing.has('plan')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE'`);
      // DB-FIX: Created plan column');
    }
    if (!existing.has('planExpiresAt')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3)`);
      // DB-FIX: Created planExpiresAt column');
    }
    if (!existing.has('stripeCustomerId')) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId")`);
      // DB-FIX: Created stripeCustomerId column');
    }

    // DB-FIX: Schema OK');
  } catch (e: any) {
    // DB-FIX ERROR: ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function bootstrap() {
  await ensureColumns();
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Security: HTTP headers
  app.use(helmet({
    contentSecurityPolicy: false, // handled by frontend meta tag
    crossOriginEmbedderPolicy: false, // allows loading external images
  }));

  // Security: CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Security: global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  // Increase body size limit for trips with cover images (base64)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '10mb' }));

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
