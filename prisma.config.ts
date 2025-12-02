// prisma.config.ts
import 'dotenv/config';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  // point to your schema location
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  // migrations dir (default is prisma/migrations)
  migrations: { path: path.join(__dirname, 'prisma', 'migrations') },

  // supply the database URL for CLI / Migrate
  datasource: {
    // env reads DATABASE_URL from .env
    url: env('DATABASE_URL'),
  },

  // If you want to target the "classic" engine behavior, include engine:
  // engine: 'classic',
});
