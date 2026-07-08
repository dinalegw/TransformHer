import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING
      ?? process.env.POSTGRES_URL
      ?? process.env.DATABASE_URL_UNPOOLED
      ?? process.env.DATABASE_URL
      ?? '',
  },
})
