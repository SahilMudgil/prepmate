import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // The Prisma CLI requires the DIRECT connection to run database migrations
    url: env("DIRECT_URL"),
  },
});