const { query } = require('../config/db-connection');

/**
 * MenuItem Model
 * Handles menu categories and items management
 */
class MenuItem {
  // =====================================
  // CATEGORIES
  // =====================================

  static async createCategory(tenantId, data) {
    const { name, description, imageUrl, sortOrder = 0 } = data;
    const result = await query(
      `INSERT INTO menu_categories (tenant_id, name, description, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tenantId, name, description, imageUrl, sortOrder]
    );
    return this.formatCategory(result.rows[0]);
  }

  static async getCategories(tenantId, includeInactive = false) {
    let sql = 'SELECT * FROM menu_categories WHERE tenant_id = $1';
    if (!includeInactive) sql += ' AND is_active = true';
    sql += ' ORDER BY sort_order, name';

    const result = await query(sql, [tenantId]);
    return result.rows.map(row => this.formatCategory(row));
  }

  static async getCategoryById(tenantId, categoryId) {
    const result = await query(
      'SELECT * FROM menu_categories WHERE tenant_id = $1 AND id = $2',
      [tenantId, categoryId]
    );
    return result.rows[0] ? this.formatCategory(result.rows[0]) : null;
  }

  static async updateCategory(tenantId, categoryId, data) {
    const { name, description, imageUrl, sortOrder, isActive } = data;
    const updates = [];
    const values = [tenantId, categoryId];
    let idx = 3;

    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description); }
    if (imageUrl !== undefined) { updates.push(`image_url = $${idx++}`); values.push(imageUrl); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${idx++}`); values.push(sortOrder); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); values.push(isActive); }

    if (updates.length === 0) return this.getCategoryById(tenantId, categoryId);

    const result = await query(
      `UPDATE menu_categories SET ${updates.join(', ')} 
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return result.rows[0] ? this.formatCategory(result.rows[0]) : null;
  }

  static async deleteCategory(tenantId, categoryId) {
    const result = await query(
      'UPDATE menu_categories SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, categoryId]
    );
    return result.rowCount > 0;
  }

  // =====================================
  // MENU ITEMS
  // =====================================

  static async create(tenantId, data) {
    const {
      categoryId,
      name,
      description,
      price,
      taxRate = 19.00,
      imageUrl,
      allergens = [],
      dietaryInfo = [],
      preparationTime = 15,
      sortOrder = 0,
      variants = [],
    } = data;

    const result = await query(
      `INSERT INTO menu_items (
        tenant_id, category_id, name, description, price, tax_rate,
        image_url, allergens, dietary_info, preparation_time, sort_order, variants
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        tenantId, categoryId, name, description, price, taxRate,
        imageUrl, allergens, dietaryInfo, preparationTime, sortOrder,
        JSON.stringify(variants)
      ]
    );
    return this.formatItem(result.rows[0]);
  }

  static async findById(tenantId, itemId) {
    const result = await query(
      `SELECT mi.*, mc.name as category_name 
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mi.category_id = mc.id
       WHERE mi.tenant_id = $1 AND mi.id = $2`,
      [tenantId, itemId]
    );
    return result.rows[0] ? this.formatItem(result.rows[0]) : null;
  }

  static async findByTenant(tenantId, options = {}) {
    const { categoryId, isAvailable, includeInactive = false, search } = options;
    
    let sql = `SELECT mi.*, mc.name as category_name 
               FROM menu_items mi
               LEFT JOIN menu_categories mc ON mi.category_id = mc.id
               WHERE mi.tenant_id = $1`;
    const params = [tenantId];
    let idx = 2;

    if (!includeInactive) sql += ' AND mi.is_active = true';
    
    if (categoryId) {
      sql += ` AND mi.category_id = $${idx++}`;
      params.push(categoryId);
    }

    if (isAvailable !== undefined) {
      sql += ` AND mi.is_available = $${idx++}`;
      params.push(isAvailable);
    }

    if (search) {
      sql += ` AND (mi.name ILIKE $${idx} OR mi.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' ORDER BY mc.sort_order, mi.sort_order, mi.name';

    const result = await query(sql, params);
    return result.rows.map(row => this.formatItem(row));
  }

  static async getMenuWithCategories(tenantId, options = {}) {
    const { includeUnavailable = false } = options;
    
    const categories = await this.getCategories(tenantId);
    const items = await this.findByTenant(tenantId, { 
      isAvailable: includeUnavailable ? undefined : true 
    });

    return categories.map(category => ({
      ...category,
      items: items.filter(item => item.categoryId === category.id),
    }));
  }

  static async update(tenantId, itemId, data) {
    const allowedFields = [
      'category_id', 'name', 'description', 'price', 'tax_rate',
      'image_url', 'allergens', 'dietary_info', 'preparation_time',
      'sort_order', 'is_available', 'is_active', 'variants'
    ];

    const updates = [];
    const values = [tenantId, itemId];
    let idx = 3;

    for (const [key, value] of Object.entries(data)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = $${idx++}`);
        if (dbKey === 'variants') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) return this.findById(tenantId, itemId);

    const result = await query(
      `UPDATE menu_items SET ${updates.join(', ')} 
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return result.rows[0] ? this.formatItem(result.rows[0]) : null;
  }

  static async setAvailability(tenantId, itemId, isAvailable) {
    return this.update(tenantId, itemId, { isAvailable });
  }

  static async delete(tenantId, itemId) {
    const result = await query(
      'UPDATE menu_items SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, itemId]
    );
    return result.rowCount > 0;
  }

  static async bulkUpdateAvailability(tenantId, updates) {
    // updates = [{ id: uuid, isAvailable: boolean }]
    const results = await Promise.all(
      updates.map(({ id, isAvailable }) => this.setAvailability(tenantId, id, isAvailable))
    );
    return results.filter(Boolean);
  }

  // =====================================
  // HELPERS
  // =====================================

  static formatCategory(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      imageUrl: row.image_url,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static formatItem(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      taxRate: parseFloat(row.tax_rate),
      imageUrl: row.image_url,
      allergens: row.allergens || [],
      dietaryInfo: row.dietary_info || [],
      preparationTime: row.preparation_time,
      sortOrder: row.sort_order,
      isAvailable: row.is_available,
      isActive: row.is_active,
      variants: row.variants || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = MenuItem;
