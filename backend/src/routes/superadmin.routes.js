const express = require('express');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const SuperAdmin = require('../models/SuperAdmin');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { query } = require('../config/db-connection');
const {
  generateSuperAdminToken,
  authenticateSuperAdmin,
  superAdminOnly,
} = require('../middleware/auth-middleware');

const router = express.Router();

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array(),
    });
  }
  next();
};

// ============================================
// PUBLIC ROUTES (Super Admin Auth)
// ============================================

/**
 * @route POST /api/superadmin/auth/login
 * @desc Super admin login
 * @access Public
 */
router.post(
  '/auth/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find super admin
      const superAdminRecord = await SuperAdmin.findByEmail(email);

      if (!superAdminRecord) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Verify password
      const isValidPassword = await SuperAdmin.verifyPassword(password, superAdminRecord.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Update last login
      await SuperAdmin.updateLastLogin(superAdminRecord.id);

      // Generate token
      const superAdmin = SuperAdmin.formatSuperAdmin(superAdminRecord);
      const token = generateSuperAdminToken(superAdmin);

      // Log the login
      await SuperAdmin.logAction(superAdmin.id, 'login', { email: superAdmin.email }, req);

      res.json({
        message: 'Login successful',
        token,
        superAdmin: {
          id: superAdmin.id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          fullName: superAdmin.fullName,
          permissions: superAdmin.permissions,
        },
      });
    } catch (error) {
      console.error('Super admin login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }
);

/**
 * @route POST /api/superadmin/auth/setup
 * @desc Create first super admin (only works if no super admin exists)
 * @access Public (one-time setup)
 */
router.post(
  '/auth/setup',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('setupKey').notEmpty().withMessage('Setup key required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check if any super admin exists
      const exists = await SuperAdmin.exists();
      if (exists) {
        return res.status(403).json({
          error: 'Setup unavailable',
          message: 'Super admin setup has already been completed',
        });
      }

      // Validate setup key (use an environment variable for this)
      const setupKey = process.env.SUPER_ADMIN_SETUP_KEY || 'initial-setup-key';
      if (req.body.setupKey !== setupKey) {
        return res.status(403).json({
          error: 'Invalid setup key',
          message: 'The setup key is incorrect',
        });
      }

      const { email, password, firstName, lastName } = req.body;

      // Create the first super admin
      const superAdmin = await SuperAdmin.create({
        email,
        password,
        firstName,
        lastName,
        permissions: ['all'],
      });

      // Log the creation
      await SuperAdmin.logAction(superAdmin.id, 'setup', { email: superAdmin.email }, req);

      // Generate token
      const token = generateSuperAdminToken(superAdmin);

      res.status(201).json({
        message: 'Super admin created successfully',
        token,
        superAdmin: {
          id: superAdmin.id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
        },
      });
    } catch (error) {
      console.error('Super admin setup error:', error);
      res.status(500).json({
        error: 'Setup failed',
        message: 'An error occurred during super admin setup',
      });
    }
  }
);

/**
 * @route GET /api/superadmin/auth/check-setup
 * @desc Check if super admin setup is required
 * @access Public
 */
router.get('/auth/check-setup', async (req, res) => {
  try {
    const exists = await SuperAdmin.exists();
    res.json({
      setupRequired: !exists,
    });
  } catch (error) {
    console.error('Check setup error:', error);
    res.status(500).json({
      error: 'Check failed',
      message: 'An error occurred while checking setup status',
    });
  }
});

// ============================================
// PROTECTED ROUTES (Require Super Admin Auth)
// ============================================
router.use(authenticateSuperAdmin);
router.use(superAdminOnly);

/**
 * @route GET /api/superadmin/me
 * @desc Get current super admin profile
 * @access Super Admin
 */
router.get('/me', async (req, res) => {
  res.json({
    superAdmin: {
      id: req.superAdmin.id,
      email: req.superAdmin.email,
      firstName: req.superAdmin.firstName,
      lastName: req.superAdmin.lastName,
      fullName: req.superAdmin.fullName,
      permissions: req.superAdmin.permissions,
      lastLogin: req.superAdmin.lastLogin,
    },
  });
});

/**
 * @route POST /api/superadmin/refresh
 * @desc Refresh super admin token
 * @access Super Admin
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = generateSuperAdminToken(req.superAdmin);
    res.json({
      message: 'Token refreshed',
      token,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: 'An error occurred while refreshing token',
    });
  }
});

// ============================================
// TENANT MANAGEMENT
// ============================================

/**
 * @route GET /api/superadmin/tenants
 * @desc Get all tenants
 * @access Super Admin
 */
router.get('/tenants', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, search } = req.query;

    let sql = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id) as total_orders
      FROM tenants t
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(t.name ILIKE $${paramIndex} OR t.email ILIKE $${paramIndex} OR t.slug ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) FROM tenants t';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countResult = await query(countSql, params.slice(0, -2));

    const tenants = result.rows.map((row) => ({
      ...Tenant.formatTenant(row),
      activeUsers: parseInt(row.active_users, 10),
      totalOrders: parseInt(row.total_orders, 10),
    }));

    await SuperAdmin.logAction(req.superAdmin.id, 'list_tenants', {}, req);

    res.json({
      tenants,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      error: 'Failed to get tenants',
      message: 'An error occurred while fetching tenants',
    });
  }
});

/**
 * @route GET /api/superadmin/tenants/:id
 * @desc Get tenant by ID with detailed stats
 * @access Super Admin
 */
router.get(
  '/tenants/:id',
  [param('id').isUUID().withMessage('Invalid tenant ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await Tenant.findById(id);

      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
      }

      // Get additional stats
      const [usersResult, ordersResult] = await Promise.all([
        query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users WHERE tenant_id = $1', [id]),
        query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE tenant_id = $1', [id]),
      ]);

      await SuperAdmin.logAction(req.superAdmin.id, 'view_tenant', { entityType: 'tenant', entityId: id }, req);

      res.json({
        tenant,
        stats: {
          users: {
            total: parseInt(usersResult.rows[0].total, 10),
            active: parseInt(usersResult.rows[0].active, 10),
          },
          orders: {
            total: parseInt(ordersResult.rows[0].total, 10),
            revenue: parseFloat(ordersResult.rows[0].revenue) || 0,
          },
        },
      });
    } catch (error) {
      console.error('Get tenant error:', error);
      res.status(500).json({
        error: 'Failed to get tenant',
        message: 'An error occurred while fetching tenant',
      });
    }
  }
);

/**
 * @route PUT /api/superadmin/tenants/:id
 * @desc Update tenant
 * @access Super Admin
 */
router.put(
  '/tenants/:id',
  [
    param('id').isUUID().withMessage('Invalid tenant ID'),
    body('name').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().trim(),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
    body('subscriptionStatus').optional().isIn(['trial', 'active', 'past_due', 'suspended', 'cancelled']),
    body('subscriptionPlan').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await Tenant.update(id, req.body);

      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
      }

      await SuperAdmin.logAction(req.superAdmin.id, 'update_tenant', {
        entityType: 'tenant',
        entityId: id,
        changes: req.body,
      }, req);

      res.json({
        message: 'Tenant updated successfully',
        tenant,
      });
    } catch (error) {
      console.error('Update tenant error:', error);
      res.status(500).json({
        error: 'Failed to update tenant',
        message: 'An error occurred while updating tenant',
      });
    }
  }
);

/**
 * @route DELETE /api/superadmin/tenants/:id
 * @desc Suspend/Deactivate tenant
 * @access Super Admin
 */
router.delete(
  '/tenants/:id',
  [param('id').isUUID().withMessage('Invalid tenant ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await Tenant.update(id, { status: 'inactive' });

      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
      }

      await SuperAdmin.logAction(req.superAdmin.id, 'deactivate_tenant', {
        entityType: 'tenant',
        entityId: id,
      }, req);

      res.json({
        message: 'Tenant deactivated successfully',
        tenant,
      });
    } catch (error) {
      console.error('Deactivate tenant error:', error);
      res.status(500).json({
        error: 'Failed to deactivate tenant',
        message: 'An error occurred while deactivating tenant',
      });
    }
  }
);

// ============================================
// CROSS-TENANT USER MANAGEMENT
// ============================================

/**
 * @route GET /api/superadmin/users
 * @desc Get all users across all tenants
 * @access Super Admin
 */
router.get('/users', async (req, res) => {
  try {
    const { tenantId, role, active, limit = 50, offset = 0, search } = req.query;

    let sql = `
      SELECT u.*, t.name as tenant_name, t.slug as tenant_slug
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
    `;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (tenantId) {
      conditions.push(`u.tenant_id = $${paramIndex}`);
      params.push(tenantId);
      paramIndex++;
    }

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (active !== undefined) {
      conditions.push(`u.is_active = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) FROM users u JOIN tenants t ON u.tenant_id = t.id';
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countResult = await query(countSql, params.slice(0, -2));

    const users = result.rows.map((row) => ({
      ...User.formatUser(row),
      tenant: {
        id: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug,
      },
    }));

    await SuperAdmin.logAction(req.superAdmin.id, 'list_users', { tenantId }, req);

    res.json({
      users,
      total: parseInt(countResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'An error occurred while fetching users',
    });
  }
});

/**
 * @route GET /api/superadmin/users/:id
 * @desc Get user by ID (cross-tenant)
 * @access Super Admin
 */
router.get(
  '/users/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT u.*, t.name as tenant_name, t.slug as tenant_slug
         FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const row = result.rows[0];
      const user = {
        ...User.formatUser(row),
        tenant: {
          id: row.tenant_id,
          name: row.tenant_name,
          slug: row.tenant_slug,
        },
      };

      await SuperAdmin.logAction(req.superAdmin.id, 'view_user', { entityType: 'user', entityId: id }, req);

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Failed to get user',
        message: 'An error occurred while fetching user',
      });
    }
  }
);

/**
 * @route PUT /api/superadmin/users/:id
 * @desc Update user (cross-tenant)
 * @access Super Admin
 */
router.put(
  '/users/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('role').optional().isIn(['admin', 'manager', 'server', 'kitchen', 'cashier']),
    body('isActive').optional().isBoolean(),
    body('password').optional().isLength({ min: 8 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // First get the user to find their tenant
      const findResult = await query('SELECT tenant_id FROM users WHERE id = $1', [id]);
      
      if (findResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const tenantId = findResult.rows[0].tenant_id;
      const user = await User.update(tenantId, id, req.body);

      await SuperAdmin.logAction(req.superAdmin.id, 'update_user', {
        entityType: 'user',
        entityId: id,
        changes: { ...req.body, password: req.body.password ? '[REDACTED]' : undefined },
      }, req);

      res.json({
        message: 'User updated successfully',
        user,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: 'Failed to update user',
        message: 'An error occurred while updating user',
      });
    }
  }
);

/**
 * @route DELETE /api/superadmin/users/:id
 * @desc Deactivate user (cross-tenant)
 * @access Super Admin
 */
router.delete(
  '/users/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // First get the user to find their tenant
      const findResult = await query('SELECT tenant_id FROM users WHERE id = $1', [id]);
      
      if (findResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const tenantId = findResult.rows[0].tenant_id;
      await User.delete(tenantId, id);

      await SuperAdmin.logAction(req.superAdmin.id, 'deactivate_user', {
        entityType: 'user',
        entityId: id,
      }, req);

      res.json({
        message: 'User deactivated successfully',
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({
        error: 'Failed to deactivate user',
        message: 'An error occurred while deactivating user',
      });
    }
  }
);

/**
 * @route POST /api/superadmin/users
 * @desc Create user for any tenant
 * @access Super Admin
 */
router.post(
  '/users',
  [
    body('tenantId').isUUID().withMessage('Valid tenant ID required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('role').isIn(['admin', 'manager', 'server', 'kitchen', 'cashier']).withMessage('Invalid role'),
    body('pinCode').optional().isLength({ min: 4, max: 10 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { tenantId, email, password, firstName, lastName, role, pinCode } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Tenant not found',
        });
      }

      // Check if email exists in tenant
      const existingUser = await User.findByEmail(tenantId, email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email already exists in this tenant',
        });
      }

      const user = await User.create(tenantId, {
        email,
        password,
        firstName,
        lastName,
        role,
        pinCode,
      });

      await SuperAdmin.logAction(req.superAdmin.id, 'create_user', {
        entityType: 'user',
        entityId: user.id,
        tenantId,
      }, req);

      res.status(201).json({
        message: 'User created successfully',
        user,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        error: 'Failed to create user',
        message: 'An error occurred while creating user',
      });
    }
  }
);

// ============================================
// SUPER ADMIN MANAGEMENT (Self + Others)
// ============================================

/**
 * @route GET /api/superadmin/admins
 * @desc Get all super admins
 * @access Super Admin
 */
router.get('/admins', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const superAdmins = await SuperAdmin.findAll({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ superAdmins });
  } catch (error) {
    console.error('Get super admins error:', error);
    res.status(500).json({
      error: 'Failed to get super admins',
      message: 'An error occurred while fetching super admins',
    });
  }
});

/**
 * @route POST /api/superadmin/admins
 * @desc Create new super admin
 * @access Super Admin
 */
router.post(
  '/admins',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 12 }).withMessage('Password must be at least 12 characters'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('permissions').optional().isArray(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, permissions } = req.body;

      // Check if email exists
      const existing = await SuperAdmin.findByEmail(email);
      if (existing) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A super admin with this email already exists',
        });
      }

      const superAdmin = await SuperAdmin.create({
        email,
        password,
        firstName,
        lastName,
        permissions: permissions || ['all'],
      });

      await SuperAdmin.logAction(req.superAdmin.id, 'create_super_admin', {
        entityType: 'super_admin',
        entityId: superAdmin.id,
      }, req);

      res.status(201).json({
        message: 'Super admin created successfully',
        superAdmin,
      });
    } catch (error) {
      console.error('Create super admin error:', error);
      res.status(500).json({
        error: 'Failed to create super admin',
        message: 'An error occurred while creating super admin',
      });
    }
  }
);

/**
 * @route PUT /api/superadmin/admins/:id
 * @desc Update super admin
 * @access Super Admin
 */
router.put(
  '/admins/:id',
  [
    param('id').isUUID().withMessage('Invalid super admin ID'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('isActive').optional().isBoolean(),
    body('permissions').optional().isArray(),
    body('password').optional().isLength({ min: 12 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const superAdmin = await SuperAdmin.update(id, req.body);

      if (!superAdmin) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Super admin not found',
        });
      }

      await SuperAdmin.logAction(req.superAdmin.id, 'update_super_admin', {
        entityType: 'super_admin',
        entityId: id,
        changes: { ...req.body, password: req.body.password ? '[REDACTED]' : undefined },
      }, req);

      res.json({
        message: 'Super admin updated successfully',
        superAdmin,
      });
    } catch (error) {
      console.error('Update super admin error:', error);
      res.status(500).json({
        error: 'Failed to update super admin',
        message: 'An error occurred while updating super admin',
      });
    }
  }
);

// ============================================
// AUDIT LOG
// ============================================

/**
 * @route GET /api/superadmin/audit-log
 * @desc Get audit log
 * @access Super Admin
 */
router.get('/audit-log', async (req, res) => {
  try {
    const { superAdminId, limit = 100, offset = 0 } = req.query;
    
    const logs = await SuperAdmin.getAuditLog(superAdminId || null, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      error: 'Failed to get audit log',
      message: 'An error occurred while fetching audit log',
    });
  }
});

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * @route GET /api/superadmin/stats
 * @desc Get platform-wide statistics
 * @access Super Admin
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      tenantsResult,
      usersResult,
      ordersResult,
      revenueResult,
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month
        FROM tenants
      `),
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active
        FROM users
      `),
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as this_month,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week
        FROM orders
      `),
      query(`
        SELECT 
          COALESCE(SUM(total_amount), 0) as total,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as this_month
        FROM orders
        WHERE payment_status = 'paid'
      `),
    ]);

    res.json({
      stats: {
        tenants: {
          total: parseInt(tenantsResult.rows[0].total, 10),
          active: parseInt(tenantsResult.rows[0].active, 10),
          newThisMonth: parseInt(tenantsResult.rows[0].new_this_month, 10),
        },
        users: {
          total: parseInt(usersResult.rows[0].total, 10),
          active: parseInt(usersResult.rows[0].active, 10),
        },
        orders: {
          total: parseInt(ordersResult.rows[0].total, 10),
          thisMonth: parseInt(ordersResult.rows[0].this_month, 10),
          thisWeek: parseInt(ordersResult.rows[0].this_week, 10),
        },
        revenue: {
          total: parseFloat(revenueResult.rows[0].total) || 0,
          thisMonth: parseFloat(revenueResult.rows[0].this_month) || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: 'An error occurred while fetching stats',
    });
  }
});

module.exports = router;
