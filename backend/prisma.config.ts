import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"];
console.log("[prisma.config] DATABASE_URL is", url ? "SET (" + url.substring(0, 30) + "...)" : "NOT SET");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
