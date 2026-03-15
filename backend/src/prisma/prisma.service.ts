import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: pg.Pool;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.ensureSchemaColumns();
    await this.$connect();
  }

  private async ensureSchemaColumns() {
    const client = await this.pool.connect();
    try {
      // Check which columns exist
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`
      );
      const existing = new Set(rows.map((r: any) => r.column_name));
      console.log('[PRISMA] Existing User columns:', [...existing].join(', '));

      // Check which enums exist
      const { rows: enums } = await client.query(
        `SELECT typname FROM pg_type WHERE typname IN ('Role', 'Plan')`
      );
      const existingEnums = new Set(enums.map((r: any) => r.typname));

      // Ensure Role enum
      if (!existingEnums.has('Role')) {
        await client.query(`CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN')`);
        console.log('[PRISMA] Created Role enum');
      }

      // Ensure role column
      if (!existing.has('role')) {
        await client.query(`ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER'`);
        await client.query(`UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'gleison423200@gmail.com'`);
        console.log('[PRISMA] Created role column');
      }

      // Ensure isActive column
      if (!existing.has('isActive')) {
        await client.query(`ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`);
        console.log('[PRISMA] Created isActive column');
      }

      // Ensure Plan enum
      if (!existingEnums.has('Plan')) {
        await client.query(`CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS')`);
        console.log('[PRISMA] Created Plan enum');
      }

      // Ensure plan column
      if (!existing.has('plan')) {
        await client.query(`ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE'`);
        console.log('[PRISMA] Created plan column');
      }

      // Ensure planExpiresAt column
      if (!existing.has('planExpiresAt')) {
        await client.query(`ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3)`);
        console.log('[PRISMA] Created planExpiresAt column');
      }

      console.log('[PRISMA] Schema columns verified OK');
    } catch (e) {
      console.error('[PRISMA] Failed to ensure schema columns:', e);
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
