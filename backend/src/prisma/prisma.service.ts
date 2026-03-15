import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env['DATABASE_URL'],
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.ensureSchemaColumns();
  }

  private async ensureSchemaColumns() {
    try {
      await this.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
            CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
          END IF;
        END $$;
      `);
      await this.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'plan') THEN
            ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE';
          END IF;
        END $$;
      `);
      await this.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'planExpiresAt') THEN
            ALTER TABLE "User" ADD COLUMN "planExpiresAt" TIMESTAMP(3);
          END IF;
        END $$;
      `);
      console.log('[PRISMA] Schema columns verified');
    } catch (e) {
      console.error('[PRISMA] Failed to ensure schema columns:', e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
