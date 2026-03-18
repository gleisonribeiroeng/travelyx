-- AlterTable: add missing columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3);

-- Convert role and plan from enum to text (if they are still enums)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
    ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    ALTER TABLE "User" ALTER COLUMN "plan" TYPE TEXT USING "plan"::TEXT;
    ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'FREE';
  END IF;
END $$;

-- Drop orphan enums
DROP TYPE IF EXISTS "Plan";
DROP TYPE IF EXISTS "Role";

-- Add unique constraint on stripeCustomerId if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- Create ItineraryItem table if not exists
CREATE TABLE IF NOT EXISTS "ItineraryItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refId" TEXT,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT,
    "label" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "tripId" TEXT NOT NULL,
    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ItineraryItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Attachment table if not exists
CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itineraryItemId" TEXT NOT NULL,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attachment_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Attachment_itineraryItemId_key" ON "Attachment"("itineraryItemId");

-- Create SupportConversation table if not exists
CREATE TABLE IF NOT EXISTS "SupportConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discordThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportConversation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "SupportConversation_discordThreadId_key" ON "SupportConversation"("discordThreadId");

-- Create SupportMessage table if not exists  
CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fromUser" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SupportMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
