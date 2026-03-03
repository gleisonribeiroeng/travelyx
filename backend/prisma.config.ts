import { defineConfig } from "prisma/config";

// Load .env for local development (Railway provides env vars natively)
try {
  require("dotenv/config");
} catch {
  // dotenv not available or no .env file — using platform env vars
}

const url = process.env["DATABASE_URL"];

if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Available env keys with 'DATA': " +
      Object.keys(process.env)
        .filter((k) => k.includes("DATA"))
        .join(", "),
  );
}

if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
  throw new Error(
    `DATABASE_URL is invalid (starts with "${url.substring(0, 15)}..."). Must start with postgresql:// or postgres://`,
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
