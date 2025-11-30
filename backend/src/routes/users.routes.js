const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth-middleware');
const { requireTenant } = require('../middleware/tenant-middleware');

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

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * @route GET /api/users
 * @desc Get all users for tenant
 * @access Private (Manager+)
 */
router.get(
  '/',
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const { role, active, limit = 100, offset = 0 } = req.query;

      const users = await User.findByTenant(req.tenantId, {
        role,
        isActive: active !== undefined ? active === 'true' : null,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      res.json({
        users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to get users',
        message: 'An error occurred while fetching users',
      });
    }
  }
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Manager+ or self)
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Users can view their own profile, managers can view all
      if (req.user.id !== id && !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view your own profile',
        });
      }

      const user = await User.findById(req.tenantId, id);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

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
 * @route POST /api/users
 * @desc Create new user
 * @access Private (Admin only)
 */
router.post(
  '/',
  authorize('admin'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('role')
      .isIn(['admin', 'manager', 'server', 'kitchen', 'cashier'])
      .withMessage('Invalid role'),
    body('pinCode')
      .optional()
      .isLength({ min: 4, max: 10 })
      .withMessage('PIN must be 4-10 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, pinCode } = req.body;

      // Check if email already exists for this tenant
      const existingUser = await User.findByEmail(req.tenantId, email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email already exists',
        });
      }

      const user = await User.create(req.tenantId, {
        email,
        password,
        firstName,
        lastName,
        role,
        pinCode,
      });

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

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Private (Admin or self for limited fields)
 */
router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ max: 100 }),
    body('lastName').optional().trim().isLength({ max: 100 }),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'server', 'kitchen', 'cashier']),
    body('pinCode')
      .optional()
      .isLength({ min: 4, max: 10 }),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;
      const isSelf = req.user.id === id;
      const isAdmin = req.user.role === 'admin';

      // Non-admins can only update their own profile with limited fields
      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update your own profile',
        });
      }

      const updateData = {};

      // Fields anyone can update for themselves
      if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
      if (req.body.pinCode !== undefined) updateData.pinCode = req.body.pinCode;

      // Admin-only fields
      if (isAdmin) {
        if (req.body.email !== undefined) updateData.email = req.body.email;
        if (req.body.role !== undefined) updateData.role = req.body.role;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
      }

      const user = await User.update(req.tenantId, id, updateData);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

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
 * @route DELETE /api/users/:id
 * @desc Delete (deactivate) user
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  authorize('admin'),
  [param('id').isUUID().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user.id === id) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'You cannot delete your own account',
        });
      }

      const success = await User.delete(req.tenantId, id);

      if (!success) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: 'An error occurred while deleting user',
      });
    }
  }
);

/**
 * @route GET /api/users/stats/count
 * @desc Get active user count (for billing)
 * @access Private (Admin only)
 */
router.get(
  '/stats/count',
  authorize('admin'),
  async (req, res) => {
    try {
      const count = await User.countActiveUsers(req.tenantId);
      res.json({ activeUsers: count });
    } catch (error) {
      console.error('Get user count error:', error);
      res.status(500).json({
        error: 'Failed to get user count',
        message: 'An error occurred while counting users',
      });
    }
  }
);

module.exports = router;
