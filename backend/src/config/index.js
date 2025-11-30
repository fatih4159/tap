require('dotenv').config();

/**
 * Parse DATABASE_URL connection string into components
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(url) {
  if (!url) return null;
  
  try {
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
    if (match) {
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4], 10),
        database: match[5],
      };
    }
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
  }
  return null;
}

// Parse DATABASE_URL or fall back to individual env vars
const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  db: {
    // Prefer DATABASE_URL, fall back to individual vars
    connectionString: process.env.DATABASE_URL,
    host: databaseUrl?.host || process.env.DB_HOST || 'localhost',
    port: databaseUrl?.port || parseInt(process.env.DB_PORT, 10) || 5432,
    database: databaseUrl?.database || process.env.DB_NAME || 'gastro_pos',
    user: databaseUrl?.user || process.env.DB_USER || 'postgres',
    password: databaseUrl?.password || process.env.DB_PASSWORD || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

module.exports = config;
