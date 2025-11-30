const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Handles JWT validation and user context attachment
 */

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {Object} tenant - Tenant object
 * @returns {string} JWT token
 */
const generateToken = (user, tenant) => {
  const payload = {
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    role: user.role,
    tenantSlug: tenant.slug,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

/**
 * Authentication middleware
 * Validates JWT and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.tenantId, decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found or inactive',
      });
    }

    // Attach user and tenant info to request
    req.user = {
      ...user,
      tenantId: decoded.tenantId,
      tenantSlug: decoded.tenantSlug,
    };

    // Also set tenantId if not already set by tenant middleware
    if (!req.tenantId) {
      req.tenantId = decoded.tenantId;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: 'Error processing authentication',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded) {
      const user = await User.findById(decoded.tenantId, decoded.userId);
      if (user && user.isActive) {
        req.user = {
          ...user,
          tenantId: decoded.tenantId,
          tenantSlug: decoded.tenantSlug,
        };
      }
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware factory
 * @param {...string} allowedRoles - Roles that can access the route
 * @returns {Function} Middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

/**
 * Admin-only middleware shorthand
 */
const adminOnly = authorize('admin');

/**
 * Manager and above middleware shorthand
 */
const managerOnly = authorize('admin', 'manager');

/**
 * Role hierarchy check
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required minimum role
 * @returns {boolean} True if user has sufficient role
 */
const hasMinimumRole = (userRole, requiredRole) => {
  const hierarchy = ['server', 'kitchen', 'cashier', 'manager', 'admin'];
  const userLevel = hierarchy.indexOf(userRole);
  const requiredLevel = hierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  managerOnly,
  hasMinimumRole,
};
