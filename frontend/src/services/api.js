/**
 * API Service
 * Handles all HTTP requests to the backend
 */

const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getTenantHeader = () => {
  const tenantId = localStorage.getItem('tenantId');
  return tenantId ? { 'X-Tenant-ID': tenantId } : {};
};

const request = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...getTenantHeader(),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.message || data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.message || 'Network error', 0, null);
  }
};

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

// Auth API
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  pinLogin: (pin) => api.post('/auth/pin-login', { pin }),
  me: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
  updatePassword: (currentPassword, newPassword) => 
    api.put('/auth/password', { currentPassword, newPassword }),
};

// Users API
export const usersApi = {
  list: (params) => api.get(`/users?${new URLSearchParams(params)}`),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Tables API
export const tablesApi = {
  list: (params) => api.get(`/tables?${new URLSearchParams(params || {})}`),
  get: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tables/${id}/status`, { status }),
  delete: (id) => api.delete(`/tables/${id}`),
  getLayout: () => api.get('/tables/layout'),
  getQR: (id) => api.get(`/tables/${id}/qr`),
  getAllQRs: () => api.get('/tables/qr/all'),
  // Floors
  getFloors: () => api.get('/tables/floors'),
  createFloor: (data) => api.post('/tables/floors', data),
  updateFloor: (id, data) => api.put(`/tables/floors/${id}`, data),
  deleteFloor: (id) => api.delete(`/tables/floors/${id}`),
  // Rooms
  getRooms: (floorId) => api.get(`/tables/rooms${floorId ? `?floorId=${floorId}` : ''}`),
  createRoom: (data) => api.post('/tables/rooms', data),
  updateRoom: (id, data) => api.put(`/tables/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/tables/rooms/${id}`),
};

// Menu API
export const menuApi = {
  getPublic: () => api.get('/menu/public'),
  getFull: () => api.get('/menu/full'),
  getItems: (params) => api.get(`/menu/items?${new URLSearchParams(params || {})}`),
  getItem: (id) => api.get(`/menu/items/${id}`),
  createItem: (data) => api.post('/menu/items', data),
  updateItem: (id, data) => api.put(`/menu/items/${id}`, data),
  setAvailability: (id, isAvailable) => api.patch(`/menu/items/${id}/availability`, { isAvailable }),
  deleteItem: (id) => api.delete(`/menu/items/${id}`),
  // Categories
  getCategories: () => api.get('/menu/categories'),
  createCategory: (data) => api.post('/menu/categories', data),
  updateCategory: (id, data) => api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/menu/categories/${id}`),
};

// Orders API
export const ordersApi = {
  list: (params) => api.get(`/orders?${new URLSearchParams(params || {})}`),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updateItemStatus: (orderId, itemId, status) => 
    api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
};

// Sync API
export const syncApi = {
  bulkSync: (operations) => api.post('/sync/bulk', { operations }),
  getChanges: (since) => api.get(`/sync/changes?since=${since}`),
  getStatus: () => api.get('/sync/status'),
};

// Billing API
export const billingApi = {
  getPlans: () => api.get('/billing/plans'),
  getUsage: () => api.get('/billing/usage'),
  subscribe: (plan, paymentMethodId) => api.post('/billing/subscribe', { plan, paymentMethodId }),
  updateSubscription: (plan) => api.put('/billing/subscription', { plan }),
  cancelSubscription: (immediate) => api.delete(`/billing/subscription?immediate=${immediate}`),
  createPortalSession: (returnUrl) => api.post('/billing/portal', { returnUrl }),
};

// Super Admin API
export const superAdminApi = {
  // Auth
  checkSetup: () => api.get('/superadmin/auth/check-setup'),
  setup: (data) => api.post('/superadmin/auth/setup', data),
  login: (email, password) => api.post('/superadmin/auth/login', { email, password }),
  me: () => api.get('/superadmin/me'),
  refresh: () => api.post('/superadmin/refresh'),
  
  // Stats
  getStats: () => api.get('/superadmin/stats'),
  
  // Tenants
  getTenants: (params) => api.get(`/superadmin/tenants?${new URLSearchParams(params || {})}`),
  getTenant: (id) => api.get(`/superadmin/tenants/${id}`),
  updateTenant: (id, data) => api.put(`/superadmin/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/superadmin/tenants/${id}`),
  
  // Users (cross-tenant)
  getUsers: (params) => api.get(`/superadmin/users?${new URLSearchParams(params || {})}`),
  getUser: (id) => api.get(`/superadmin/users/${id}`),
  createUser: (data) => api.post('/superadmin/users', data),
  updateUser: (id, data) => api.put(`/superadmin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/superadmin/users/${id}`),
  
  // Super Admins
  getSuperAdmins: () => api.get('/superadmin/admins'),
  createSuperAdmin: (data) => api.post('/superadmin/admins', data),
  updateSuperAdmin: (id, data) => api.put(`/superadmin/admins/${id}`, data),
  
  // Audit Log
  getAuditLog: (params) => api.get(`/superadmin/audit-log?${new URLSearchParams(params || {})}`),
};

export default api;
