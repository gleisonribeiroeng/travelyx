-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL DEFAULT '',
    "destination" TEXT NOT NULL DEFAULT '',
    "dateStart" TEXT NOT NULL DEFAULT '',
    "dateEnd" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planejamento',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "flights" TEXT NOT NULL DEFAULT '[]',
    "stays" TEXT NOT NULL DEFAULT '[]',
    "carRentals" TEXT NOT NULL DEFAULT '[]',
    "transports" TEXT NOT NULL DEFAULT '[]',
    "activities" TEXT NOT NULL DEFAULT '[]',
    "attractions" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("activities", "attractions", "carRentals", "createdAt", "dateEnd", "dateStart", "destination", "flights", "id", "name", "stays", "transports", "updatedAt", "userId") SELECT "activities", "attractions", "carRentals", "createdAt", "dateEnd", "dateStart", "destination", "flights", "id", "name", "stays", "transports", "updatedAt", "userId" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
