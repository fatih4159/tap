const bcrypt = require('bcryptjs');
const { pool, testConnection, closePool } = require('../config/db-connection');

/**
 * Debug Authentication Issues
 * Run this script to diagnose login problems
 */

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues...\n');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Check your DATABASE_URL or DB_* environment variables.');
    process.exit(1);
  }

  try {
    // Check for users
    console.log('\n📋 Checking users in database...');
    const usersResult = await pool.query(`
      SELECT u.id, u.email, u.is_active, u.role, 
             LENGTH(u.password_hash) as hash_length,
             LEFT(u.password_hash, 7) as hash_prefix,
             t.name as tenant_name, t.status as tenant_status
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    if (usersResult.rows.length === 0) {
      console.log('❌ No users found in database!');
      console.log('   Run: npm run seed');
      return;
    }

    console.log(`\n✅ Found ${usersResult.rows.length} user(s):\n`);
    usersResult.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.email}`);
      console.log(`      - Role: ${user.role}`);
      console.log(`      - Active: ${user.is_active}`);
      console.log(`      - Tenant: ${user.tenant_name} (${user.tenant_status})`);
      console.log(`      - Password hash: ${user.hash_prefix}... (${user.hash_length} chars)`);
      console.log('');
    });

    // Test password verification for admin@demo.com
    console.log('\n🔐 Testing password verification for admin@demo.com...');
    const adminResult = await pool.query(
      `SELECT password_hash FROM users WHERE email = $1`,
      ['admin@demo.com']
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ admin@demo.com not found in database!');
    } else {
      const hash = adminResult.rows[0].password_hash;
      console.log(`   Hash stored: ${hash.substring(0, 20)}...`);
      console.log(`   Hash length: ${hash.length}`);
      
      // Test if it's a valid bcrypt hash
      const isValidBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$');
      console.log(`   Valid bcrypt format: ${isValidBcrypt}`);

      if (isValidBcrypt) {
        // Test with known password
        const testPassword = 'admin123';
        const isMatch = await bcrypt.compare(testPassword, hash);
        console.log(`   Password 'admin123' matches: ${isMatch}`);

        if (!isMatch) {
          console.log('\n⚠️  Password does not match! The hash in the database may be different.');
          console.log('   Generating new hash for comparison...');
          const newHash = await bcrypt.hash(testPassword, 12);
          console.log(`   New hash would be: ${newHash.substring(0, 20)}...`);
          
          console.log('\n🔧 To fix this, run the reset password script:');
          console.log('   npm run reset-admin-password');
        }
      } else {
        console.log('\n⚠️  Password hash is NOT in valid bcrypt format!');
        console.log('   This could happen if the password was stored as plain text or corrupted.');
      }
    }

    // Check tenant status
    console.log('\n📦 Checking tenants...');
    const tenantsResult = await pool.query(`
      SELECT name, slug, status, subscription_status 
      FROM tenants 
      ORDER BY created_at DESC
    `);

    tenantsResult.rows.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug})`);
      console.log(`     Status: ${tenant.status}, Subscription: ${tenant.subscription_status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  debugAuth()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Debug error:', error);
      process.exit(1);
    });
}

module.exports = { debugAuth };
