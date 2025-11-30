const { query } = require('../config/db-connection');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Handles all user-related database operations with tenant scoping
 */
class User {
  /**
   * Create a new user
   * @param {string} tenantId - Tenant UUID
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user (without password)
   */
  static async create(tenantId, data) {
    const {
      email,
      password,
      firstName = null,
      lastName = null,
      role = 'server',
      pinCode = null,
    } = data;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, pin_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [tenantId, email, passwordHash, firstName, lastName, role, pinCode]
    );

    return this.formatUser(result.rows[0]);
  }

  /**
   * Find user by ID within tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - User UUID
   * @returns {Promise<Object|null>} User or null
   */
  static async findById(tenantId, id) {
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
    return result.rows[0] ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Find user by email within tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User with password hash or null
   */
  static async findByEmail(tenantId, email) {
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email across all tenants (for login)
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User with tenant info or null
   */
  static async findByEmailGlobal(email) {
    const result = await query(
      `SELECT u.*, t.slug as tenant_slug, t.name as tenant_name, t.status as tenant_status
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by PIN within tenant (quick login)
   * @param {string} tenantId - Tenant UUID
   * @param {string} pinCode - PIN code
   * @returns {Promise<Object|null>} User or null
   */
  static async findByPin(tenantId, pinCode) {
    const result = await query(
      'SELECT * FROM users WHERE tenant_id = $1 AND pin_code = $2 AND is_active = true',
      [tenantId, pinCode]
    );
    return result.rows[0] ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Update user
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - User UUID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated user
   */
  static async update(tenantId, id, data) {
    const allowedFields = [
      'email',
      'first_name',
      'last_name',
      'role',
      'pin_code',
      'is_active',
      'settings',
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = $${paramIndex}`);
        values.push(dbKey === 'settings' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    // Handle password update separately
    if (data.password) {
      const passwordHash = await bcrypt.hash(data.password, 12);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.findById(tenantId, id);
    }

    values.push(tenantId, id);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} 
       WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} 
       RETURNING *`,
      values
    );

    return result.rows[0] ? this.formatUser(result.rows[0]) : null;
  }

  /**
   * Update last login timestamp
   * @param {string} id - User UUID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(id) {
    await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }

  /**
   * Get all users for a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of users
   */
  static async findByTenant(tenantId, { limit = 100, offset = 0, role = null, isActive = null } = {}) {
    let sql = 'SELECT * FROM users WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (role) {
      sql += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (isActive !== null) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map((row) => this.formatUser(row));
  }

  /**
   * Count active users for a tenant (for billing)
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<number>} Active user count
   */
  static async countActiveUsers(tenantId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Verify password
   * @param {string} password - Plain password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} True if valid
   */
  static async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Delete user (soft delete by deactivating)
   * @param {string} tenantId - Tenant UUID
   * @param {string} id - User UUID
   * @returns {Promise<boolean>} Success
   */
  static async delete(tenantId, id) {
    const result = await query(
      'UPDATE users SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );
    return result.rowCount > 0;
  }

  /**
   * Format user object from database row (excludes sensitive data)
   * @param {Object} row - Database row
   * @returns {Object} Formatted user
   */
  static formatUser(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      role: row.role,
      isActive: row.is_active,
      lastLogin: row.last_login,
      settings: row.settings || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   * @param {string} str - CamelCase string
   * @returns {string} snake_case string
   */
  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

module.exports = User;
