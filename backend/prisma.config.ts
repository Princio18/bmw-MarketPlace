import 'dotenv/config'
import { defineConfig } from 'prisma/config'

function resolveUrl() {
  const url = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error('Missing database URL: set DATABASE_URL (or PRISMA_DATABASE_URL) in backend/.env')
  }
  return url
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: resolveUrl(),
  },
})