const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const { generateToken, authenticate } = require('../middleware/auth-middleware');
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

/**
 * @route POST /api/auth/register
 * @desc Register a new tenant and admin user
 * @access Public
 */
router.post(
  '/register',
  [
    body('restaurantName').notEmpty().trim().withMessage('Restaurant name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { restaurantName, email, password, firstName, lastName } = req.body;

      // Check if email already exists
      const existingUser = await User.findByEmailGlobal(email);
      if (existingUser) {
        return res.status(400).json({
          error: 'Registration failed',
          message: 'An account with this email already exists',
        });
      }

      // Generate a unique slug from restaurant name
      let slug = restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Check if slug is available, if not append a random string
      let isAvailable = await Tenant.isSlugAvailable(slug);
      if (!isAvailable) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
      }

      // Create tenant
      const tenant = await Tenant.create({
        name: restaurantName,
        slug,
        email,
        subscriptionPlan: 'starter',
      });

      // Create admin user for the tenant
      const user = await User.create(tenant.id, {
        email,
        password,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'admin',
      });

      // Generate token
      const token = generateToken(user, tenant);

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration',
      });
    }
  }
);

/**
 * @route POST /api/auth/login
 * @desc Login with email and password
 * @access Public
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user globally (across all tenants)
      const userRecord = await User.findByEmailGlobal(email);

      if (!userRecord) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Check tenant status
      if (userRecord.tenant_status !== 'active') {
        return res.status(403).json({
          error: 'Account unavailable',
          message: 'Your organization account is not active',
        });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(password, userRecord.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
        });
      }

      // Get full tenant info
      const tenant = await Tenant.findById(userRecord.tenant_id);

      // Update last login
      await User.updateLastLogin(userRecord.id);

      // Generate token
      const user = User.formatUser ? User.formatUser(userRecord) : userRecord;
      const token = generateToken(user, tenant);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || user.first_name,
          lastName: user.lastName || user.last_name,
          role: user.role,
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  }
);

/**
 * @route POST /api/auth/pin-login
 * @desc Quick login with PIN code (requires tenant context)
 * @access Public (with tenant)
 */
router.post(
  '/pin-login',
  requireTenant,
  [
    body('pin').isLength({ min: 4, max: 10 }).withMessage('PIN must be 4-10 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { pin } = req.body;
      const tenantId = req.tenant.id;

      const user = await User.findByPin(tenantId, pin);

      if (!user) {
        return res.status(401).json({
          error: 'Invalid PIN',
          message: 'The PIN code is incorrect',
        });
      }

      // Update last login
      await User.updateLastLogin(user.id);

      // Generate token
      const token = generateToken(user, req.tenant);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('PIN login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during PIN login',
      });
    }
  }
);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        fullName: req.user.fullName,
        role: req.user.role,
        lastLogin: req.user.lastLogin,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionStatus: tenant.subscriptionStatus,
        subscriptionPlan: tenant.subscriptionPlan,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching profile',
    });
  }
});

/**
 * @route PUT /api/auth/password
 * @desc Update current user password
 * @access Private
 */
router.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password hash
      const userRecord = await User.findByEmail(req.user.tenantId, req.user.email);

      // Verify current password
      const isValid = await User.verifyPassword(currentPassword, userRecord.password_hash);

      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid password',
          message: 'Current password is incorrect',
        });
      }

      // Update password
      await User.update(req.user.tenantId, req.user.id, { password: newPassword });

      res.json({
        message: 'Password updated successfully',
      });
    } catch (error) {
      console.error('Password update error:', error);
      res.status(500).json({
        error: 'Failed to update password',
        message: 'An error occurred while updating password',
      });
    }
  }
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Private
 */
router.post('/refresh', authenticate, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.user.tenantId);
    const token = generateToken(req.user, tenant);

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

module.exports = router;
