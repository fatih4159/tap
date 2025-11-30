const { query } = require('../config/db-connection');

/**
 * Tenant Model
 * Handles all tenant-related database operations
 */
class Tenant {
  /**
   * Create a new tenant
   * @param {Object} data - Tenant data
   * @returns {Promise<Object>} Created tenant
   */
  static async create(data) {
    const {
      name,
      slug,
      email,
      phone = null,
      address = null,
      logoUrl = null,
      subscriptionPlan = 'starter',
      settings = {},
    } = data;

    const result = await query(
      `INSERT INTO tenants (name, slug, email, phone, address, logo_url, subscription_plan, settings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, slug, email, phone, address, logoUrl, subscriptionPlan, JSON.stringify(settings)]
    );

    return this.formatTenant(result.rows[0]);
  }

  /**
   * Find tenant by ID
   * @param {string} id - Tenant UUID
   * @returns {Promise<Object|null>} Tenant or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM tenants WHERE id = $1', [id]);
    return result.rows[0] ? this.formatTenant(result.rows[0]) : null;
  }

  /**
   * Find tenant by slug
   * @param {string} slug - Tenant slug
   * @returns {Promise<Object|null>} Tenant or null
   */
  static async findBySlug(slug) {
    const result = await query('SELECT * FROM tenants WHERE slug = $1', [slug]);
    return result.rows[0] ? this.formatTenant(result.rows[0]) : null;
  }

  /**
   * Find tenant by Stripe customer ID
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object|null>} Tenant or null
   */
  static async findByStripeCustomerId(customerId) {
    const result = await query(
      'SELECT * FROM tenants WHERE stripe_customer_id = $1',
      [customerId]
    );
    return result.rows[0] ? this.formatTenant(result.rows[0]) : null;
  }

  /**
   * Update tenant
   * @param {string} id - Tenant UUID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated tenant
   */
  static async update(id, data) {
    const allowedFields = [
      'name',
      'email',
      'phone',
      'address',
      'logo_url',
      'status',
      'subscription_status',
      'subscription_plan',
      'stripe_customer_id',
      'stripe_subscription_id',
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

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] ? this.formatTenant(result.rows[0]) : null;
  }

  /**
   * Get all tenants (admin only)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of tenants
   */
  static async findAll({ limit = 50, offset = 0, status = null } = {}) {
    let sql = 'SELECT * FROM tenants';
    const params = [];

    if (status) {
      sql += ' WHERE status = $1';
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows.map((row) => this.formatTenant(row));
  }

  /**
   * Check if slug is available
   * @param {string} slug - Slug to check
   * @returns {Promise<boolean>} True if available
   */
  static async isSlugAvailable(slug) {
    const result = await query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    return result.rows.length === 0;
  }

  /**
   * Update subscription status
   * @param {string} id - Tenant UUID
   * @param {string} status - New subscription status
   * @returns {Promise<Object>} Updated tenant
   */
  static async updateSubscriptionStatus(id, status) {
    return this.update(id, { subscriptionStatus: status });
  }

  /**
   * Format tenant object from database row
   * @param {Object} row - Database row
   * @returns {Object} Formatted tenant
   */
  static formatTenant(row) {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      phone: row.phone,
      address: row.address,
      logoUrl: row.logo_url,
      status: row.status,
      subscriptionStatus: row.subscription_status,
      subscriptionPlan: row.subscription_plan,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
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

module.exports = Tenant;
