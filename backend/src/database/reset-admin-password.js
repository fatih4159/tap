const bcrypt = require('bcryptjs');
const { pool, testConnection, closePool } = require('../config/db-connection');

/**
 * Reset Admin Password
 * Resets the admin@demo.com password to 'admin123'
 */

const DEFAULT_ADMIN = {
  email: 'admin@demo.com',
  password: 'admin123',
};

async function resetAdminPassword() {
  console.log('🔐 Resetting admin password...\n');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database.');
    process.exit(1);
  }

  try {
    // Check if admin user exists
    const userResult = await pool.query(
      'SELECT id, email, is_active FROM users WHERE email = $1',
      [DEFAULT_ADMIN.email]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User ${DEFAULT_ADMIN.email} not found!`);
      console.log('   Run "npm run seed" first to create the demo users.');
      return;
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Active: ${user.is_active}`);

    // Generate new password hash
    console.log('\n🔑 Generating new password hash...');
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 12);
    console.log(`   New hash: ${passwordHash.substring(0, 20)}...`);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, is_active = true WHERE email = $2',
      [passwordHash, DEFAULT_ADMIN.email]
    );

    console.log('\n✅ Password reset successfully!');
    console.log('\n📋 Login credentials:');
    console.log(`   Email: ${DEFAULT_ADMIN.email}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);

    // Verify the update worked
    console.log('\n🔍 Verifying update...');
    const verifyResult = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [DEFAULT_ADMIN.email]
    );
    
    const isMatch = await bcrypt.compare(DEFAULT_ADMIN.password, verifyResult.rows[0].password_hash);
    console.log(`   Password verification: ${isMatch ? '✅ SUCCESS' : '❌ FAILED'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  resetAdminPassword()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Reset error:', error);
      process.exit(1);
    });
}

module.exports = { resetAdminPassword };
