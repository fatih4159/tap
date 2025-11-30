const { query } = require('../config/db-connection');

/**
 * Sync Service
 * Handles offline-first synchronization for client data
 * Processes queued operations from offline clients
 */
class SyncService {
  /**
   * Process bulk sync request from client
   * @param {string} tenantId - Tenant UUID
   * @param {Array} operations - Array of sync operations
   * @returns {Promise<Object>} Sync result with processed and failed operations
   */
  static async processBulkSync(tenantId, operations) {
    const results = {
      processed: [],
      failed: [],
      serverTimestamp: new Date().toISOString(),
    };

    for (const operation of operations) {
      try {
        const result = await this.processOperation(tenantId, operation);
        results.processed.push({
          clientId: operation.clientId,
          entityType: operation.entityType,
          entityId: result.entityId,
          operation: operation.operation,
          serverTimestamp: result.serverTimestamp,
        });
      } catch (error) {
        results.failed.push({
          clientId: operation.clientId,
          entityType: operation.entityType,
          operation: operation.operation,
          error: error.message,
        });

        // Log failed operation for retry
        await this.logFailedOperation(tenantId, operation, error.message);
      }
    }

    return results;
  }

  /**
   * Process a single sync operation
   * @param {string} tenantId - Tenant UUID
   * @param {Object} operation - Sync operation
   * @returns {Promise<Object>} Operation result
   */
  static async processOperation(tenantId, operation) {
    const { entityType, operation: opType, payload, clientTimestamp } = operation;

    // Log the operation to sync queue
    await this.logOperation(tenantId, {
      entityType,
      entityId: payload.id || null,
      operation: opType,
      payload,
      clientTimestamp,
    });

    let entityId;

    switch (entityType) {
      case 'order':
        entityId = await this.syncOrder(tenantId, opType, payload);
        break;
      case 'order_item':
        entityId = await this.syncOrderItem(tenantId, opType, payload);
        break;
      case 'table_status':
        entityId = await this.syncTableStatus(tenantId, opType, payload);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    return {
      entityId,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Sync order data
   * @param {string} tenantId - Tenant UUID
   * @param {string} operation - Operation type
   * @param {Object} payload - Order data
   * @returns {Promise<string>} Order ID
   */
  static async syncOrder(tenantId, operation, payload) {
    switch (operation) {
      case 'create': {
        const result = await query(
          `INSERT INTO orders (
            tenant_id, table_id, user_id, order_number, status, order_type,
            customer_name, customer_notes, subtotal, tax_amount, total_amount, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id`,
          [
            tenantId,
            payload.tableId,
            payload.userId,
            payload.orderNumber || await this.generateOrderNumber(tenantId),
            payload.status || 'pending',
            payload.orderType || 'dine_in',
            payload.customerName,
            payload.customerNotes,
            payload.subtotal || 0,
            payload.taxAmount || 0,
            payload.totalAmount || 0,
            JSON.stringify(payload.metadata || {}),
          ]
        );
        return result.rows[0].id;
      }

      case 'update': {
        const updates = [];
        const values = [tenantId, payload.id];
        let paramIndex = 3;

        const allowedFields = ['status', 'customer_notes', 'subtotal', 'tax_amount', 'total_amount', 'payment_status', 'payment_method'];
        
        for (const [key, value] of Object.entries(payload)) {
          const dbKey = this.toSnakeCase(key);
          if (allowedFields.includes(dbKey)) {
            updates.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }

        if (updates.length > 0) {
          await query(
            `UPDATE orders SET ${updates.join(', ')} WHERE tenant_id = $1 AND id = $2`,
            values
          );
        }
        return payload.id;
      }

      case 'delete': {
        await query(
          'UPDATE orders SET status = $1 WHERE tenant_id = $2 AND id = $3',
          ['cancelled', tenantId, payload.id]
        );
        return payload.id;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Sync order item data
   * @param {string} tenantId - Tenant UUID
   * @param {string} operation - Operation type
   * @param {Object} payload - Order item data
   * @returns {Promise<string>} Order item ID
   */
  static async syncOrderItem(tenantId, operation, payload) {
    switch (operation) {
      case 'create': {
        const result = await query(
          `INSERT INTO order_items (
            tenant_id, order_id, menu_item_id, name, quantity,
            unit_price, tax_rate, total_price, notes, modifiers
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            tenantId,
            payload.orderId,
            payload.menuItemId,
            payload.name,
            payload.quantity,
            payload.unitPrice,
            payload.taxRate || 19.00,
            payload.totalPrice,
            payload.notes,
            JSON.stringify(payload.modifiers || []),
          ]
        );
        return result.rows[0].id;
      }

      case 'update': {
        const updates = [];
        const values = [tenantId, payload.id];
        let paramIndex = 3;

        const allowedFields = ['quantity', 'status', 'notes'];
        
        for (const [key, value] of Object.entries(payload)) {
          const dbKey = this.toSnakeCase(key);
          if (allowedFields.includes(dbKey)) {
            updates.push(`${dbKey} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
          }
        }

        // Recalculate total if quantity changed
        if (payload.quantity) {
          const item = await query(
            'SELECT unit_price FROM order_items WHERE tenant_id = $1 AND id = $2',
            [tenantId, payload.id]
          );
          if (item.rows[0]) {
            updates.push(`total_price = $${paramIndex}`);
            values.push(payload.quantity * item.rows[0].unit_price);
            paramIndex++;
          }
        }

        if (updates.length > 0) {
          await query(
            `UPDATE order_items SET ${updates.join(', ')} WHERE tenant_id = $1 AND id = $2`,
            values
          );
        }
        return payload.id;
      }

      case 'delete': {
        await query(
          'UPDATE order_items SET status = $1 WHERE tenant_id = $2 AND id = $3',
          ['cancelled', tenantId, payload.id]
        );
        return payload.id;
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Sync table status
   * @param {string} tenantId - Tenant UUID
   * @param {string} operation - Operation type
   * @param {Object} payload - Table status data
   * @returns {Promise<string>} Table ID
   */
  static async syncTableStatus(tenantId, operation, payload) {
    await query(
      'UPDATE tables SET status = $1 WHERE tenant_id = $2 AND id = $3',
      [payload.status, tenantId, payload.id]
    );
    return payload.id;
  }

  /**
   * Generate order number
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<string>} Order number
   */
  static async generateOrderNumber(tenantId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const result = await query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE`,
      [tenantId]
    );
    const count = parseInt(result.rows[0].count, 10) + 1;
    return `${today}-${count.toString().padStart(4, '0')}`;
  }

  /**
   * Log sync operation to queue
   * @param {string} tenantId - Tenant UUID
   * @param {Object} data - Operation data
   */
  static async logOperation(tenantId, data) {
    await query(
      `INSERT INTO sync_queue (tenant_id, entity_type, entity_id, operation, payload, client_timestamp, processed)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        tenantId,
        data.entityType,
        data.entityId || '00000000-0000-0000-0000-000000000000',
        data.operation,
        JSON.stringify(data.payload),
        data.clientTimestamp,
      ]
    );
  }

  /**
   * Log failed operation for retry
   * @param {string} tenantId - Tenant UUID
   * @param {Object} operation - Failed operation
   * @param {string} errorMessage - Error message
   */
  static async logFailedOperation(tenantId, operation, errorMessage) {
    await query(
      `INSERT INTO sync_queue (tenant_id, entity_type, entity_id, operation, payload, client_timestamp, processed, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
      [
        tenantId,
        operation.entityType,
        operation.payload?.id || '00000000-0000-0000-0000-000000000000',
        operation.operation,
        JSON.stringify(operation.payload),
        operation.clientTimestamp,
        errorMessage,
      ]
    );
  }

  /**
   * Get pending sync operations for retry
   * @param {string} tenantId - Tenant UUID
   * @param {number} limit - Max operations to retrieve
   * @returns {Promise<Array>} Pending operations
   */
  static async getPendingOperations(tenantId, limit = 100) {
    const result = await query(
      `SELECT * FROM sync_queue 
       WHERE tenant_id = $1 AND processed = false AND retry_count < 3
       ORDER BY client_timestamp ASC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows;
  }

  /**
   * Get changes since timestamp for client sync
   * @param {string} tenantId - Tenant UUID
   * @param {string} since - ISO timestamp
   * @returns {Promise<Object>} Changes by entity type
   */
  static async getChangesSince(tenantId, since) {
    const timestamp = new Date(since);

    const [orders, orderItems, tables, menuItems] = await Promise.all([
      query(
        'SELECT * FROM orders WHERE tenant_id = $1 AND updated_at > $2 ORDER BY updated_at',
        [tenantId, timestamp]
      ),
      query(
        'SELECT * FROM order_items WHERE tenant_id = $1 AND updated_at > $2 ORDER BY updated_at',
        [tenantId, timestamp]
      ),
      query(
        'SELECT * FROM tables WHERE tenant_id = $1 AND updated_at > $2 ORDER BY updated_at',
        [tenantId, timestamp]
      ),
      query(
        'SELECT * FROM menu_items WHERE tenant_id = $1 AND updated_at > $2 ORDER BY updated_at',
        [tenantId, timestamp]
      ),
    ]);

    return {
      orders: orders.rows,
      orderItems: orderItems.rows,
      tables: tables.rows,
      menuItems: menuItems.rows,
      serverTimestamp: new Date().toISOString(),
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

module.exports = SyncService;
