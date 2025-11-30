import { io } from 'socket.io-client';

/**
 * Socket.IO Service
 * Handles real-time communication with the backend
 */

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      socket.disconnect();
    }
  });

  socket.on('connected', (data) => {
    console.log('🔌 Socket authenticated:', data);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Event subscription helpers
export const onNewOrder = (callback) => {
  socket?.on('order:new', callback);
  return () => socket?.off('order:new', callback);
};

export const onOrderStatus = (callback) => {
  socket?.on('order:status', callback);
  return () => socket?.off('order:status', callback);
};

export const onOrderItemUpdated = (callback) => {
  socket?.on('order:item:updated', callback);
  return () => socket?.off('order:item:updated', callback);
};

export const onOrderReady = (callback) => {
  socket?.on('order:ready', callback);
  return () => socket?.off('order:ready', callback);
};

export const onTableStatus = (callback) => {
  socket?.on('table:status', callback);
  return () => socket?.off('table:status', callback);
};

export const onMenuItemUpdated = (callback) => {
  socket?.on('menu:item:updated', callback);
  return () => socket?.off('menu:item:updated', callback);
};

export const onWaiterCalled = (callback) => {
  socket?.on('waiter:called', callback);
  return () => socket?.off('waiter:called', callback);
};

// Emit events
export const joinTable = (tableId) => {
  socket?.emit('join:table', tableId);
};

export const leaveTable = (tableId) => {
  socket?.emit('leave:table', tableId);
};

export const updateOrderItemStatus = (data) => {
  socket?.emit('order:item:status', data);
};

export const callWaiter = (data) => {
  socket?.emit('call:waiter', data);
};

export default {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  onNewOrder,
  onOrderStatus,
  onOrderItemUpdated,
  onOrderReady,
  onTableStatus,
  onMenuItemUpdated,
  onWaiterCalled,
  joinTable,
  leaveTable,
  updateOrderItemStatus,
  callWaiter,
};
