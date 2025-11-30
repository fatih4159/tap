const { query } = require('../config/db-connection');

/**
 * Table Model
 * Handles restaurant tables, floors, and rooms management
 */
class Table {
  // =====================================
  // FLOORS
  // =====================================

  static async createFloor(tenantId, data) {
    const { name, sortOrder = 0 } = data;
    const result = await query(
      `INSERT INTO floors (tenant_id, name, sort_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tenantId, name, sortOrder]
    );
    return this.formatFloor(result.rows[0]);
  }

  static async getFloors(tenantId) {
    const result = await query(
      `SELECT * FROM floors 
       WHERE tenant_id = $1 AND is_active = true 
       ORDER BY sort_order, name`,
      [tenantId]
    );
    return result.rows.map(row => this.formatFloor(row));
  }

  static async updateFloor(tenantId, floorId, data) {
    const { name, sortOrder, isActive } = data;
    const updates = [];
    const values = [tenantId, floorId];
    let idx = 3;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    if (updates.length === 0) return null;

    const result = await query(
      `UPDATE floors SET ${updates.join(', ')} 
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return result.rows[0] ? this.formatFloor(result.rows[0]) : null;
  }

  static async deleteFloor(tenantId, floorId) {
    const result = await query(
      'UPDATE floors SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, floorId]
    );
    return result.rowCount > 0;
  }

  // =====================================
  // ROOMS
  // =====================================

  static async createRoom(tenantId, data) {
    const { floorId, name, sortOrder = 0 } = data;
    const result = await query(
      `INSERT INTO rooms (tenant_id, floor_id, name, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [tenantId, floorId, name, sortOrder]
    );
    return this.formatRoom(result.rows[0]);
  }

  static async getRooms(tenantId, floorId = null) {
    let sql = `SELECT r.*, f.name as floor_name FROM rooms r
               JOIN floors f ON r.floor_id = f.id
               WHERE r.tenant_id = $1 AND r.is_active = true`;
    const params = [tenantId];

    if (floorId) {
      sql += ' AND r.floor_id = $2';
      params.push(floorId);
    }

    sql += ' ORDER BY f.sort_order, r.sort_order, r.name';

    const result = await query(sql, params);
    return result.rows.map(row => this.formatRoom(row));
  }

  static async updateRoom(tenantId, roomId, data) {
    const { name, floorId, sortOrder, isActive } = data;
    const updates = [];
    const values = [tenantId, roomId];
    let idx = 3;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (floorId !== undefined) {
      updates.push(`floor_id = $${idx++}`);
      values.push(floorId);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(isActive);
    }

    if (updates.length === 0) return null;

    const result = await query(
      `UPDATE rooms SET ${updates.join(', ')} 
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return result.rows[0] ? this.formatRoom(result.rows[0]) : null;
  }

  static async deleteRoom(tenantId, roomId) {
    const result = await query(
      'UPDATE rooms SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, roomId]
    );
    return result.rowCount > 0;
  }

  // =====================================
  // TABLES
  // =====================================

  static async create(tenantId, data) {
    const {
      roomId,
      tableNumber,
      name,
      capacity = 4,
      positionX = 0,
      positionY = 0,
      shape = 'rectangle',
    } = data;

    // Generate unique QR code token
    const qrCodeToken = this.generateQRToken(tenantId, tableNumber);

    const result = await query(
      `INSERT INTO tables (
        tenant_id, room_id, table_number, name, capacity,
        position_x, position_y, shape, qr_code_token
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [tenantId, roomId, tableNumber, name, capacity, positionX, positionY, shape, qrCodeToken]
    );
    return this.formatTable(result.rows[0]);
  }

  static async findById(tenantId, tableId) {
    const result = await query(
      `SELECT t.*, r.name as room_name, f.name as floor_name
       FROM tables t
       LEFT JOIN rooms r ON t.room_id = r.id
       LEFT JOIN floors f ON r.floor_id = f.id
       WHERE t.tenant_id = $1 AND t.id = $2`,
      [tenantId, tableId]
    );
    return result.rows[0] ? this.formatTable(result.rows[0]) : null;
  }

  static async findByQRToken(qrToken) {
    const result = await query(
      `SELECT t.*, ten.slug as tenant_slug
       FROM tables t
       JOIN tenants ten ON t.tenant_id = ten.id
       WHERE t.qr_code_token = $1 AND t.is_active = true`,
      [qrToken]
    );
    return result.rows[0] ? this.formatTable(result.rows[0]) : null;
  }

  static async findByTenant(tenantId, options = {}) {
    const { roomId, status, includeInactive = false } = options;
    
    let sql = `SELECT t.*, r.name as room_name, f.name as floor_name
               FROM tables t
               LEFT JOIN rooms r ON t.room_id = r.id
               LEFT JOIN floors f ON r.floor_id = f.id
               WHERE t.tenant_id = $1`;
    const params = [tenantId];
    let idx = 2;

    if (!includeInactive) {
      sql += ' AND t.is_active = true';
    }

    if (roomId) {
      sql += ` AND t.room_id = $${idx++}`;
      params.push(roomId);
    }

    if (status) {
      sql += ` AND t.status = $${idx++}`;
      params.push(status);
    }

    sql += ' ORDER BY t.table_number';

    const result = await query(sql, params);
    return result.rows.map(row => this.formatTable(row));
  }

  static async update(tenantId, tableId, data) {
    const allowedFields = [
      'room_id', 'table_number', 'name', 'capacity',
      'position_x', 'position_y', 'shape', 'status', 'is_active'
    ];

    const updates = [];
    const values = [tenantId, tableId];
    let idx = 3;

    for (const [key, value] of Object.entries(data)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = $${idx++}`);
        values.push(value);
      }
    }

    if (updates.length === 0) return this.findById(tenantId, tableId);

    const result = await query(
      `UPDATE tables SET ${updates.join(', ')} 
       WHERE tenant_id = $1 AND id = $2 RETURNING *`,
      values
    );
    return result.rows[0] ? this.formatTable(result.rows[0]) : null;
  }

  static async updateStatus(tenantId, tableId, status) {
    return this.update(tenantId, tableId, { status });
  }

  static async delete(tenantId, tableId) {
    const result = await query(
      'UPDATE tables SET is_active = false WHERE tenant_id = $1 AND id = $2',
      [tenantId, tableId]
    );
    return result.rowCount > 0;
  }

  static async regenerateQRToken(tenantId, tableId) {
    const table = await this.findById(tenantId, tableId);
    if (!table) return null;

    const newToken = this.generateQRToken(tenantId, table.tableNumber);
    
    const result = await query(
      'UPDATE tables SET qr_code_token = $1 WHERE tenant_id = $2 AND id = $3 RETURNING *',
      [newToken, tenantId, tableId]
    );
    return result.rows[0] ? this.formatTable(result.rows[0]) : null;
  }

  // =====================================
  // LAYOUT (Full structure)
  // =====================================

  static async getFullLayout(tenantId) {
    const floors = await this.getFloors(tenantId);
    const rooms = await this.getRooms(tenantId);
    const tables = await this.findByTenant(tenantId);

    // Build hierarchical structure
    return floors.map(floor => ({
      ...floor,
      rooms: rooms
        .filter(r => r.floorId === floor.id)
        .map(room => ({
          ...room,
          tables: tables.filter(t => t.roomId === room.id),
        })),
    }));
  }

  // =====================================
  // HELPERS
  // =====================================

  static generateQRToken(tenantId, tableNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${tenantId.substring(0, 8)}-${tableNumber}-${timestamp}-${random}`;
  }

  static formatFloor(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static formatRoom(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      floorId: row.floor_id,
      floorName: row.floor_name,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static formatTable(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantSlug: row.tenant_slug,
      roomId: row.room_id,
      roomName: row.room_name,
      floorName: row.floor_name,
      tableNumber: row.table_number,
      name: row.name,
      capacity: row.capacity,
      positionX: row.position_x,
      positionY: row.position_y,
      shape: row.shape,
      status: row.status,
      qrCodeToken: row.qr_code_token,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = Table;
