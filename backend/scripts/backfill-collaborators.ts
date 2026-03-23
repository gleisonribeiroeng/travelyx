import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfill() {
  await prisma.$connect();
  const trips = await prisma.trip.findMany({ select: { id: true, userId: true } });
  let created = 0;
  for (const trip of trips) {
    const existing = await prisma.tripCollaborator.findUnique({
      where: { tripId_userId: { tripId: trip.id, userId: trip.userId } },
    });
    if (!existing) {
      await prisma.tripCollaborator.create({
        data: { tripId: trip.id, userId: trip.userId, role: 'OWNER' },
      });
      created++;
    }
  }
  console.log(`Backfilled ${created} OWNER records for ${trips.length} trips`);
  await prisma.$disconnect();
  await pool.end();
}

backfill().catch((e) => {
  console.error(e);
  process.exit(1);
});
