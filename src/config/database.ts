import 'dotenv/config';
import ws from 'ws';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Node 18 lacks built-in WebSocket — provide ws as the constructor
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// In development with neon-local, Envoy multiplexes HTTP/WS/PG on port 5432
// The default neon driver targets port 443 (HTTPS/WSS) which doesn't exist
if (process.env.NODE_ENV === 'development') {
  neonConfig.fetchEndpoint = (host) => `http://${host}:5432/sql`;
  neonConfig.wsProxy = (host) => `${host}:5432/v2`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export { db, sql };
