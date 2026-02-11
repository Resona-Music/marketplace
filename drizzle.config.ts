import 'dotenv/config';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { defineConfig } from 'drizzle-kit';

// Node 18 lacks built-in WebSocket — provide ws as the constructor
neonConfig.webSocketConstructor = ws;

// drizzle-kit uses @neondatabase/serverless Pool (WebSocket) for migrations.
// In development with neon-local, Envoy multiplexes all traffic on port 5432.
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = host => `${host}:5432/v2`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export default defineConfig({
  schema: './src/models/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
