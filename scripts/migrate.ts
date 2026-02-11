import 'dotenv/config';
import ws from 'ws';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Node 18 lacks built-in WebSocket — provide ws as the constructor
neonConfig.webSocketConstructor = ws;

// Configure for neon-local in development (Envoy proxy on port 5432)
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = host => `${host}:5432/v2`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: './drizzle' });
await pool.end();

console.log('Migrations applied successfully');
process.exit(0);
