const { Pool } = require('pg');
const config = require('./index');

/**
 * Database Connection Pool
 * Implements connection pooling for PostgreSQL with multi-tenancy support.
 * We use Row-Level Security (RLS) approach where each tenant's data is
 * isolated by tenant_id column in shared tables.
 */

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection events in development
if (config.env === 'development') {
  pool.on('connect', () => {
    console.log('📦 New client connected to PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

/**
 * Execute a query with optional tenant context
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {string|null} tenantId - Optional tenant ID for RLS context
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params = [], tenantId = null) => {
  const client = await pool.connect();
  try {
    // Set tenant context for Row-Level Security if tenantId provided
    if (tenantId) {
      await client.query('SET app.current_tenant_id = $1', [tenantId]);
    }
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Execute a transaction with tenant context
 * @param {Function} callback - Async function receiving the client
 * @param {string|null} tenantId - Optional tenant ID for RLS context
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback, tenantId = null) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Set tenant context for the transaction
    if (tenantId) {
      await client.query('SET app.current_tenant_id = $1', [tenantId]);
    }
    
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get a client for complex operations
 * Remember to release the client when done
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Close all connections in the pool
 * Use for graceful shutdown
 */
const closePool = async () => {
  await pool.end();
  console.log('🔌 Database pool has been closed');
};

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection status
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected at:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query,
  transaction,
  getClient,
  closePool,
  testConnection,
};
