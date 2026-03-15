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
      // Ensure Plan enum exists
      const enumCheck = await client.query(
        `SELECT 1 FROM pg_type WHERE typname = 'Plan'`
      );
      if (enumCheck.rowCount === 0) {
        await client.query(`CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS')`);
        console.log('[PRISMA] Created Plan enum');
      }

      // Ensure plan column exists
      const planCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'plan'`
      );
      if (planCheck.rowCount === 0) {
        await client.query(`ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE'`);
        console.log('[PRISMA] Created plan column');
      }

      // Ensure planExpiresAt column exists
      const expiresCheck = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'planExpiresAt'`
      );
      if (expiresCheck.rowCount === 0) {
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
