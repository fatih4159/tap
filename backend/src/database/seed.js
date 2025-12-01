const bcrypt = require('bcryptjs');
const { pool, testConnection, closePool } = require('../config/db-connection');

/**
 * Database Seeder
 * Creates demo tenant and admin user for development/testing
 */

// Demo credentials - CHANGE THESE IN PRODUCTION
const DEMO_TENANT = {
  name: 'Demo Restaurant',
  slug: 'demo',
  email: 'demo@restaurant.com',
  phone: '+49 123 456789',
  address: 'Musterstraße 1, 10115 Berlin',
};

const DEMO_ADMIN = {
  email: 'admin@demo.com',
  password: 'admin123',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'admin',
  pinCode: '1234',
};

const DEMO_USERS = [
  {
    email: 'manager@demo.com',
    password: 'manager123',
    firstName: 'Max',
    lastName: 'Manager',
    role: 'manager',
    pinCode: '2222',
  },
  {
    email: 'server@demo.com',
    password: 'server123',
    firstName: 'Sarah',
    lastName: 'Server',
    role: 'server',
    pinCode: '3333',
  },
];

const DEMO_FLOORS = [
  { name: 'Ground Floor', sortOrder: 0 },
  { name: 'Terrace', sortOrder: 1 },
];

const DEMO_ROOMS = [
  { floorIndex: 0, name: 'Main Hall', sortOrder: 0 },
  { floorIndex: 0, name: 'Bar Area', sortOrder: 1 },
  { floorIndex: 1, name: 'Outdoor Terrace', sortOrder: 0 },
];

const DEMO_TABLES = [
  { roomIndex: 0, tableNumber: '1', name: 'Window Table', capacity: 4 },
  { roomIndex: 0, tableNumber: '2', name: 'Center Table', capacity: 6 },
  { roomIndex: 0, tableNumber: '3', name: 'Corner Booth', capacity: 4 },
  { roomIndex: 0, tableNumber: '4', name: 'Large Party', capacity: 8 },
  { roomIndex: 1, tableNumber: 'B1', name: 'Bar Seat 1', capacity: 2 },
  { roomIndex: 1, tableNumber: 'B2', name: 'Bar Seat 2', capacity: 2 },
  { roomIndex: 2, tableNumber: 'T1', name: 'Terrace 1', capacity: 4 },
  { roomIndex: 2, tableNumber: 'T2', name: 'Terrace 2', capacity: 4 },
];

const DEMO_CATEGORIES = [
  { name: 'Starters', description: 'Appetizers and small bites', sortOrder: 0 },
  { name: 'Main Courses', description: 'Hearty main dishes', sortOrder: 1 },
  { name: 'Desserts', description: 'Sweet treats', sortOrder: 2 },
  { name: 'Beverages', description: 'Drinks and refreshments', sortOrder: 3 },
];

const DEMO_MENU_ITEMS = [
  // Starters
  { categoryIndex: 0, name: 'Bruschetta', description: 'Toasted bread with tomatoes and basil', price: 7.50, taxRate: 19 },
  { categoryIndex: 0, name: 'Soup of the Day', description: 'Ask your server for today\'s selection', price: 6.00, taxRate: 19 },
  { categoryIndex: 0, name: 'Caesar Salad', description: 'Romaine lettuce with caesar dressing', price: 9.50, taxRate: 19 },
  // Main Courses
  { categoryIndex: 1, name: 'Grilled Salmon', description: 'Fresh salmon with seasonal vegetables', price: 22.00, taxRate: 19 },
  { categoryIndex: 1, name: 'Beef Steak', description: '250g ribeye with herb butter', price: 28.50, taxRate: 19 },
  { categoryIndex: 1, name: 'Pasta Carbonara', description: 'Classic Italian pasta dish', price: 14.50, taxRate: 19 },
  { categoryIndex: 1, name: 'Vegetable Curry', description: 'Spicy coconut curry with rice', price: 13.00, taxRate: 19, dietaryInfo: ['vegetarian', 'vegan'] },
  // Desserts
  { categoryIndex: 2, name: 'Tiramisu', description: 'Classic Italian coffee dessert', price: 7.00, taxRate: 19 },
  { categoryIndex: 2, name: 'Chocolate Cake', description: 'Rich chocolate layer cake', price: 6.50, taxRate: 19 },
  { categoryIndex: 2, name: 'Ice Cream', description: 'Three scoops of your choice', price: 5.00, taxRate: 19 },
  // Beverages
  { categoryIndex: 3, name: 'Coffee', description: 'Freshly brewed', price: 3.00, taxRate: 19 },
  { categoryIndex: 3, name: 'Tea', description: 'Various selections', price: 3.00, taxRate: 19 },
  { categoryIndex: 3, name: 'Soft Drink', description: 'Cola, Fanta, Sprite', price: 3.50, taxRate: 19 },
  { categoryIndex: 3, name: 'Beer (0.5L)', description: 'German pilsner', price: 4.50, taxRate: 19 },
  { categoryIndex: 3, name: 'House Wine', description: 'Red or white, per glass', price: 5.50, taxRate: 19 },
];

async function seed(forceReseed = false) {
  console.log('🌱 Starting database seeding...\n');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('❌ Cannot connect to database. Please check your configuration.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if demo tenant already exists
    const existingTenant = await client.query(
      'SELECT id FROM tenants WHERE slug = $1',
      [DEMO_TENANT.slug]
    );

    if (existingTenant.rows.length > 0) {
      if (forceReseed) {
        console.log('🗑️  Force reseed: Deleting existing demo tenant and data...');
        await client.query('DELETE FROM tenants WHERE slug = $1', [DEMO_TENANT.slug]);
        console.log('   ✅ Deleted existing demo data\n');
      } else {
        console.log('⚠️  Demo tenant already exists. Skipping seed.');
        console.log('   Use --force to reseed: npm run seed:force');
        console.log('\n📋 Existing Demo Credentials:');
        console.log('   Email: admin@demo.com');
        console.log('   Password: admin123');
        console.log('   PIN: 1234\n');
        await client.query('ROLLBACK');
        return;
      }
    }

    // 1. Create tenant
    console.log('📦 Creating demo tenant...');
    const tenantResult = await client.query(
      `INSERT INTO tenants (name, slug, email, phone, address, status, subscription_status, subscription_plan)
       VALUES ($1, $2, $3, $4, $5, 'active', 'active', 'professional')
       RETURNING id`,
      [DEMO_TENANT.name, DEMO_TENANT.slug, DEMO_TENANT.email, DEMO_TENANT.phone, DEMO_TENANT.address]
    );
    const tenantId = tenantResult.rows[0].id;
    console.log(`   ✅ Created tenant: ${DEMO_TENANT.name} (${tenantId})\n`);

    // 2. Create admin user
    console.log('👤 Creating admin user...');
    const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN.password, 12);
    await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, pin_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tenantId, DEMO_ADMIN.email, adminPasswordHash, DEMO_ADMIN.firstName, DEMO_ADMIN.lastName, DEMO_ADMIN.role, DEMO_ADMIN.pinCode]
    );
    console.log(`   ✅ Created admin: ${DEMO_ADMIN.email}\n`);

    // 3. Create additional users
    console.log('👥 Creating additional users...');
    for (const user of DEMO_USERS) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, pin_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, user.email, passwordHash, user.firstName, user.lastName, user.role, user.pinCode]
      );
      console.log(`   ✅ Created ${user.role}: ${user.email}`);
    }
    console.log('');

    // 4. Create floors
    console.log('🏢 Creating floors...');
    const floorIds = [];
    for (const floor of DEMO_FLOORS) {
      const result = await client.query(
        `INSERT INTO floors (tenant_id, name, sort_order)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [tenantId, floor.name, floor.sortOrder]
      );
      floorIds.push(result.rows[0].id);
      console.log(`   ✅ Created floor: ${floor.name}`);
    }
    console.log('');

    // 5. Create rooms
    console.log('🚪 Creating rooms...');
    const roomIds = [];
    for (const room of DEMO_ROOMS) {
      const result = await client.query(
        `INSERT INTO rooms (tenant_id, floor_id, name, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [tenantId, floorIds[room.floorIndex], room.name, room.sortOrder]
      );
      roomIds.push(result.rows[0].id);
      console.log(`   ✅ Created room: ${room.name}`);
    }
    console.log('');

    // 6. Create tables
    console.log('🪑 Creating tables...');
    for (const table of DEMO_TABLES) {
      await client.query(
        `INSERT INTO tables (tenant_id, room_id, table_number, name, capacity)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, roomIds[table.roomIndex], table.tableNumber, table.name, table.capacity]
      );
      console.log(`   ✅ Created table: ${table.tableNumber} - ${table.name}`);
    }
    console.log('');

    // 7. Create menu categories
    console.log('📂 Creating menu categories...');
    const categoryIds = [];
    for (const category of DEMO_CATEGORIES) {
      const result = await client.query(
        `INSERT INTO menu_categories (tenant_id, name, description, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [tenantId, category.name, category.description, category.sortOrder]
      );
      categoryIds.push(result.rows[0].id);
      console.log(`   ✅ Created category: ${category.name}`);
    }
    console.log('');

    // 8. Create menu items
    console.log('🍽️  Creating menu items...');
    for (const item of DEMO_MENU_ITEMS) {
      await client.query(
        `INSERT INTO menu_items (tenant_id, category_id, name, description, price, tax_rate, dietary_info)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId,
          categoryIds[item.categoryIndex],
          item.name,
          item.description,
          item.price,
          item.taxRate,
          item.dietaryInfo || [],
        ]
      );
      console.log(`   ✅ Created item: ${item.name} (€${item.price.toFixed(2)})`);
    }
    console.log('');

    await client.query('COMMIT');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Demo Login Credentials:\n');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │  SUPER ADMIN                                        │');
    console.log('   │  Email:    admin@demo.com                           │');
    console.log('   │  Password: admin123                                 │');
    console.log('   │  PIN:      1234                                     │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │  MANAGER                                            │');
    console.log('   │  Email:    manager@demo.com                         │');
    console.log('   │  Password: manager123                               │');
    console.log('   │  PIN:      2222                                     │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │  SERVER                                             │');
    console.log('   │  Email:    server@demo.com                          │');
    console.log('   │  Password: server123                                │');
    console.log('   │  PIN:      3333                                     │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('🌐 Access the app at: http://localhost:5173');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  const forceReseed = process.argv.includes('--force') || process.argv.includes('-f');
  seed(forceReseed)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed error:', error);
      process.exit(1);
    });
}

module.exports = { seed };
