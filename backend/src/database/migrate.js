const fs = require('fs');
const path = require('path');
const { pool, testConnection, closePool } = require('../config/db-connection');

/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Migration tracking table
const createMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// Get list of executed migrations
const getExecutedMigrations = async (client) => {
  const result = await client.query('SELECT name FROM _migrations ORDER BY name');
  return result.rows.map((row) => row.name);
};

// Record a migration as executed
const recordMigration = async (client, name) => {
  await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
};

// Get migration files
const getMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
};

// Run migrations
const runMigrations = async () => {
  console.log('🔄 Starting database migrations...\n');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await createMigrationsTable(client);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(client);
    console.log(`📋 Already executed: ${executedMigrations.length} migrations\n`);

    // Get migration files
    const migrationFiles = getMigrationFiles();
    console.log(`📁 Found ${migrationFiles.length} migration files\n`);

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Database is up to date. No migrations to run.\n');
      return;
    }

    console.log(`⏳ Running ${pendingMigrations.length} pending migrations...\n`);

    // Execute each pending migration
    for (const migrationFile of pendingMigrations) {
      console.log(`📄 Running: ${migrationFile}`);

      const filePath = path.join(MIGRATIONS_DIR, migrationFile);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await recordMigration(client, migrationFile);
        await client.query('COMMIT');
        console.log(`   ✅ Completed: ${migrationFile}\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed: ${migrationFile}`);
        console.error(`   Error: ${error.message}\n`);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!\n');
  } finally {
    client.release();
    await closePool();
  }
};

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
