import { defineConfig } from "prisma/config";

// Load .env for local development
try {
  require("dotenv/config");
} catch {
  // dotenv not available
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
