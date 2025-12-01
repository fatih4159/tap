const { query } = require('../config/db-connection');
const bcrypt = require('bcryptjs');

/**
 * SuperAdmin Model
 * Handles platform-level super admin operations (cross-tenant access)
 */
class SuperAdmin {
  /**
   * Create a new super admin
   * @param {Object} data - Super admin data
   * @returns {Promise<Object>} Created super admin (without password)
   */
  static async create(data) {
    const {
      email,
      password,
      firstName = null,
      lastName = null,
      permissions = ['all'],
    } = data;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO super_admins (email, password_hash, first_name, last_name, permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [email, passwordHash, firstName, lastName, JSON.stringify(permissions)]
    );

    return this.formatSuperAdmin(result.rows[0]);
  }

  /**
   * Find super admin by ID
   * @param {string} id - Super admin UUID
   * @returns {Promise<Object|null>} Super admin or null
   */
  static async findById(id) {
    const result = await query(
      'SELECT * FROM super_admins WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.formatSuperAdmin(result.rows[0]) : null;
  }

  /**
   * Find super admin by email
   * @param {string} email - Super admin email
   * @returns {Promise<Object|null>} Super admin with password hash or null
   */
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM super_admins WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all super admins
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of super admins
   */
  static async findAll({ limit = 50, offset = 0, isActive = null } = {}) {
    let sql = 'SELECT * FROM super_admins';
    const params = [];
    let paramIndex = 1;

    if (isActive !== null) {
      sql += ` WHERE is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map((row) => this.formatSuperAdmin(row));
  }

  /**
   * Update super admin
   * @param {string} id - Super admin UUID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated super admin
   */
  static async update(id, data) {
    const allowedFields = [
      'email',
      'first_name',
      'last_name',
      'is_active',
      'permissions',
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(data)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = $${paramIndex}`);
        values.push(dbKey === 'permissions' ? JSON.stringify(value) : value);
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
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE super_admins SET ${updates.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    );

    return result.rows[0] ? this.formatSuperAdmin(result.rows[0]) : null;
  }

  /**
   * Update last login timestamp
   * @param {string} id - Super admin UUID
   * @returns {Promise<void>}
   */
  static async updateLastLogin(id) {
    await query('UPDATE super_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
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
   * Delete super admin (soft delete)
   * @param {string} id - Super admin UUID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id) {
    const result = await query(
      'UPDATE super_admins SET is_active = false WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Log super admin action for audit
   * @param {string} superAdminId - Super admin UUID
   * @param {string} action - Action name
   * @param {Object} details - Action details
   * @param {Object} req - Express request for IP/UA
   * @returns {Promise<void>}
   */
  static async logAction(superAdminId, action, details = {}, req = null) {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.ip) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await query(
      `INSERT INTO super_admin_audit_log 
       (super_admin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        superAdminId,
        action,
        details.entityType || null,
        details.entityId || null,
        JSON.stringify(details),
        ipAddress,
        userAgent,
      ]
    );
  }

  /**
   * Get audit log for super admin
   * @param {string} superAdminId - Super admin UUID (optional - all if null)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Audit log entries
   */
  static async getAuditLog(superAdminId = null, { limit = 100, offset = 0 } = {}) {
    let sql = `
      SELECT al.*, sa.email as super_admin_email
      FROM super_admin_audit_log al
      JOIN super_admins sa ON al.super_admin_id = sa.id
    `;
    const params = [];
    let paramIndex = 1;

    if (superAdminId) {
      sql += ` WHERE al.super_admin_id = $${paramIndex}`;
      params.push(superAdminId);
      paramIndex++;
    }

    sql += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Check if any super admin exists (for initial setup)
   * @returns {Promise<boolean>}
   */
  static async exists() {
    const result = await query('SELECT COUNT(*) as count FROM super_admins');
    return parseInt(result.rows[0].count, 10) > 0;
  }

  /**
   * Format super admin object from database row
   * @param {Object} row - Database row
   * @returns {Object} Formatted super admin
   */
  static formatSuperAdmin(row) {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      isActive: row.is_active,
      permissions: row.permissions || ['all'],
      lastLogin: row.last_login,
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

module.exports = SuperAdmin;
