const { query } = require('../config/db-connection');

/**
 * Tenant Middleware
 * Extracts tenant context from request and validates tenant access.
 * Supports multiple tenant identification methods:
 * 1. Subdomain (e.g., restaurant-name.gastro-pos.com)
 * 2. Header (X-Tenant-ID)
 * 3. Query parameter (for QR code flows)
 * 4. JWT token (for authenticated users)
 */

/**
 * Extract tenant identifier from request
 * Priority: Header > Query > Subdomain > JWT
 * @param {Object} req - Express request object
 * @returns {string|null} Tenant identifier
 */
const extractTenantId = (req) => {
  // 1. Check X-Tenant-ID header (API clients)
  if (req.headers['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }

  // 2. Check query parameter (QR code flows)
  if (req.query.tenant_id) {
    return req.query.tenant_id;
  }

  // 3. Check subdomain
  const host = req.hostname || req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
    return subdomain;
  }

  // 4. Check JWT payload (set by auth middleware)
  if (req.user && req.user.tenantId) {
    return req.user.tenantId;
  }

  return null;
};

/**
 * Validate tenant exists and is active
 * @param {string} tenantId - Tenant identifier (UUID or slug)
 * @returns {Promise<Object|null>} Tenant data or null
 */
const validateTenant = async (tenantId) => {
  try {
    const result = await query(
      `SELECT id, name, slug, status, subscription_status, settings 
       FROM tenants 
       WHERE (id = $1 OR slug = $1) AND status = 'active'`,
      [tenantId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error validating tenant:', error.message);
    return null;
  }
};

/**
 * Main tenant middleware
 * Attaches tenant context to request for downstream use
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const tenantIdentifier = extractTenantId(req);

    if (!tenantIdentifier) {
      // Allow public routes without tenant context
      req.tenant = null;
      return next();
    }

    const tenant = await validateTenant(tenantIdentifier);

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        message: 'The requested tenant does not exist or is inactive.',
      });
    }

    // Check subscription status
    if (tenant.subscription_status === 'suspended') {
      return res.status(402).json({
        error: 'Subscription suspended',
        message: 'This account has been suspended due to payment issues.',
      });
    }

    if (tenant.subscription_status === 'cancelled') {
      return res.status(403).json({
        error: 'Subscription cancelled',
        message: 'This account subscription has been cancelled.',
      });
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error processing tenant context.',
    });
  }
};

/**
 * Require tenant middleware
 * Use this for routes that MUST have a valid tenant
 */
const requireTenant = (req, res, next) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant required',
      message: 'This endpoint requires a valid tenant context.',
    });
  }
  next();
};

/**
 * Tenant scope helper for queries
 * Ensures queries are scoped to current tenant
 * @param {Object} req - Express request with tenant context
 * @returns {Object} Query conditions for tenant scope
 */
const getTenantScope = (req) => {
  if (!req.tenant) {
    throw new Error('No tenant context available');
  }
  return { tenantId: req.tenant.id };
};

module.exports = {
  tenantMiddleware,
  requireTenant,
  extractTenantId,
  validateTenant,
  getTenantScope,
};
