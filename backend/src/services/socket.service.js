const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Socket.IO Service
 * Handles real-time communication for:
 * - Kitchen Display System (KDS) updates
 * - Order status changes
 * - Table status updates
 * - Staff notifications
 */

let io = null;

// Store active connections by tenant and role
const connections = new Map(); // tenantId -> Map(userId -> socket)
// Room naming convention:
// - tenant:{tenantId}:kitchen - Kitchen staff
// - tenant:{tenantId}:servers - Server/Waiter staff
// - tenant:{tenantId}:admin - Admin/Manager
// - tenant:{tenantId}:table:{tableId} - Table-specific channel

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.userRole = decoded.role;
      socket.tenantSlug = decoded.tenantSlug;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.userId}, Tenant: ${socket.tenantId})`);

    // Track connection
    if (!connections.has(socket.tenantId)) {
      connections.set(socket.tenantId, new Map());
    }
    connections.get(socket.tenantId).set(socket.userId, socket);

    // Join tenant-specific rooms based on role
    const tenantRoom = `tenant:${socket.tenantId}`;
    socket.join(tenantRoom);

    // Join role-specific rooms
    const roleRooms = getRoleRooms(socket.tenantId, socket.userRole);
    roleRooms.forEach((room) => socket.join(room));

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.userId,
      tenantId: socket.tenantId,
      role: socket.userRole,
      rooms: [tenantRoom, ...roleRooms],
    });

    // Handle joining table-specific room (for guest ordering)
    socket.on('join:table', (tableId) => {
      const tableRoom = `tenant:${socket.tenantId}:table:${tableId}`;
      socket.join(tableRoom);
      console.log(`📍 Socket ${socket.id} joined table room: ${tableRoom}`);
    });

    // Handle leaving table room
    socket.on('leave:table', (tableId) => {
      const tableRoom = `tenant:${socket.tenantId}:table:${tableId}`;
      socket.leave(tableRoom);
    });

    // Handle order item status update from kitchen
    socket.on('order:item:status', (data) => {
      handleOrderItemStatus(socket, data);
    });

    // Handle call waiter request
    socket.on('call:waiter', (data) => {
      handleCallWaiter(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
      
      if (connections.has(socket.tenantId)) {
        connections.get(socket.tenantId).delete(socket.userId);
      }
    });
  });

  console.log('🔌 Socket.IO server initialized');
  return io;
};

/**
 * Get role-specific rooms for a user
 * @param {string} tenantId - Tenant ID
 * @param {string} role - User role
 * @returns {Array<string>} Room names
 */
const getRoleRooms = (tenantId, role) => {
  const rooms = [];
  
  switch (role) {
    case 'admin':
    case 'manager':
      rooms.push(`tenant:${tenantId}:admin`);
      rooms.push(`tenant:${tenantId}:kitchen`);
      rooms.push(`tenant:${tenantId}:servers`);
      break;
    case 'kitchen':
      rooms.push(`tenant:${tenantId}:kitchen`);
      break;
    case 'server':
    case 'cashier':
      rooms.push(`tenant:${tenantId}:servers`);
      break;
  }
  
  return rooms;
};

/**
 * Handle order item status update
 * @param {Object} socket - Socket instance
 * @param {Object} data - Status update data
 */
const handleOrderItemStatus = (socket, data) => {
  const { orderId, itemId, status, tableId } = data;

  // Broadcast to relevant rooms
  const tenantRoom = `tenant:${socket.tenantId}`;
  
  io.to(tenantRoom).emit('order:item:updated', {
    orderId,
    itemId,
    status,
    tableId,
    updatedBy: socket.userId,
    timestamp: new Date().toISOString(),
  });

  // If ready, specifically notify servers
  if (status === 'ready') {
    io.to(`tenant:${socket.tenantId}:servers`).emit('order:ready', {
      orderId,
      itemId,
      tableId,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Handle call waiter request from table
 * @param {Object} socket - Socket instance
 * @param {Object} data - Request data
 */
const handleCallWaiter = (socket, data) => {
  const { tableId, tableNumber, reason } = data;

  io.to(`tenant:${socket.tenantId}:servers`).emit('waiter:called', {
    tableId,
    tableNumber,
    reason,
    timestamp: new Date().toISOString(),
  });

  // Acknowledge to requester
  socket.emit('waiter:called:ack', {
    message: 'Waiter has been notified',
    timestamp: new Date().toISOString(),
  });
};

// ==========================================
// Public API for emitting events from routes
// ==========================================

/**
 * Emit new order to kitchen and relevant staff
 * @param {string} tenantId - Tenant ID
 * @param {Object} order - Order data
 */
const emitNewOrder = (tenantId, order) => {
  if (!io) return;

  // Notify kitchen
  io.to(`tenant:${tenantId}:kitchen`).emit('order:new', {
    order,
    timestamp: new Date().toISOString(),
  });

  // Notify servers
  io.to(`tenant:${tenantId}:servers`).emit('order:new', {
    order,
    timestamp: new Date().toISOString(),
  });

  // Notify table if applicable
  if (order.tableId) {
    io.to(`tenant:${tenantId}:table:${order.tableId}`).emit('order:confirmed', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Emit order status update
 * @param {string} tenantId - Tenant ID
 * @param {Object} data - Update data
 */
const emitOrderStatusUpdate = (tenantId, data) => {
  if (!io) return;

  const { orderId, status, tableId } = data;

  // Broadcast to all tenant staff
  io.to(`tenant:${tenantId}`).emit('order:status', {
    orderId,
    status,
    tableId,
    timestamp: new Date().toISOString(),
  });

  // Notify specific table
  if (tableId) {
    io.to(`tenant:${tenantId}:table:${tableId}`).emit('order:status', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Emit table status update
 * @param {string} tenantId - Tenant ID
 * @param {Object} data - Table data
 */
const emitTableStatusUpdate = (tenantId, data) => {
  if (!io) return;

  io.to(`tenant:${tenantId}`).emit('table:status', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit menu item availability update
 * @param {string} tenantId - Tenant ID
 * @param {Object} data - Menu item data
 */
const emitMenuItemUpdate = (tenantId, data) => {
  if (!io) return;

  io.to(`tenant:${tenantId}`).emit('menu:item:updated', {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit notification to specific user
 * @param {string} tenantId - Tenant ID
 * @param {string} userId - Target user ID
 * @param {Object} notification - Notification data
 */
const emitToUser = (tenantId, userId, notification) => {
  if (!io || !connections.has(tenantId)) return;

  const userSocket = connections.get(tenantId).get(userId);
  if (userSocket) {
    userSocket.emit('notification', notification);
  }
};

/**
 * Get Socket.IO instance
 * @returns {Object|null} Socket.IO instance
 */
const getIO = () => io;

/**
 * Get connected users count for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {number} Connected users count
 */
const getConnectedUsersCount = (tenantId) => {
  if (!connections.has(tenantId)) return 0;
  return connections.get(tenantId).size;
};

module.exports = {
  initializeSocket,
  getIO,
  emitNewOrder,
  emitOrderStatusUpdate,
  emitTableStatusUpdate,
  emitMenuItemUpdate,
  emitToUser,
  getConnectedUsersCount,
};
