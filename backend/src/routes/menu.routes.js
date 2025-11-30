const express = require('express');
const { body, param, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const { authenticate, authorize } = require('../middleware/auth-middleware');
const { requireTenant, tenantMiddleware } = require('../middleware/tenant-middleware');
const { emitMenuItemUpdate } = require('../services/socket.service');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }
  next();
};

// =====================
// PUBLIC MENU (for guests)
// =====================

router.get(
  '/public',
  tenantMiddleware,
  requireTenant,
  async (req, res) => {
    try {
      const menu = await MenuItem.getMenuWithCategories(req.tenantId, {
        includeUnavailable: false,
      });
      res.json({ menu, tenant: { name: req.tenant.name, logo: req.tenant.logoUrl } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get menu', message: error.message });
    }
  }
);

// =====================
// AUTHENTICATED ROUTES
// =====================

router.use(authenticate);
router.use(requireTenant);

// =====================
// CATEGORIES
// =====================

router.get('/categories', async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' && ['admin', 'manager'].includes(req.user.role);
    const categories = await MenuItem.getCategories(req.tenantId, includeInactive);
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories', message: error.message });
  }
});

router.post(
  '/categories',
  authorize('admin', 'manager'),
  [body('name').notEmpty().withMessage('Category name required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await MenuItem.createCategory(req.tenantId, req.body);
      res.status(201).json({ category });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create category', message: error.message });
    }
  }
);

router.put(
  '/categories/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const category = await MenuItem.updateCategory(req.tenantId, req.params.id, req.body);
      if (!category) return res.status(404).json({ error: 'Category not found' });
      res.json({ category });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update category', message: error.message });
    }
  }
);

router.delete(
  '/categories/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await MenuItem.deleteCategory(req.tenantId, req.params.id);
      if (!success) return res.status(404).json({ error: 'Category not found' });
      res.json({ message: 'Category deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete category', message: error.message });
    }
  }
);

// =====================
// MENU ITEMS
// =====================

router.get('/items', async (req, res) => {
  try {
    const { categoryId, available, search } = req.query;
    const items = await MenuItem.findByTenant(req.tenantId, {
      categoryId,
      isAvailable: available !== undefined ? available === 'true' : undefined,
      search,
      includeInactive: ['admin', 'manager'].includes(req.user.role) && req.query.all === 'true',
    });
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get items', message: error.message });
  }
});

router.get('/full', async (req, res) => {
  try {
    const menu = await MenuItem.getMenuWithCategories(req.tenantId, {
      includeUnavailable: ['admin', 'manager', 'server'].includes(req.user.role),
    });
    res.json({ menu });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get menu', message: error.message });
  }
});

router.get('/items/:id', [param('id').isUUID()], handleValidationErrors, async (req, res) => {
  try {
    const item = await MenuItem.findById(req.tenantId, req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get item', message: error.message });
  }
});

router.post(
  '/items',
  authorize('admin', 'manager'),
  [
    body('name').notEmpty().withMessage('Item name required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const item = await MenuItem.create(req.tenantId, req.body);
      res.status(201).json({ item });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item', message: error.message });
    }
  }
);

router.put(
  '/items/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const item = await MenuItem.update(req.tenantId, req.params.id, req.body);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json({ item });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item', message: error.message });
    }
  }
);

router.patch(
  '/items/:id/availability',
  authorize('admin', 'manager', 'kitchen'),
  [
    param('id').isUUID(),
    body('isAvailable').isBoolean().withMessage('Availability required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const item = await MenuItem.setAvailability(req.tenantId, req.params.id, req.body.isAvailable);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      // Emit real-time update
      emitMenuItemUpdate(req.tenantId, {
        itemId: item.id,
        name: item.name,
        isAvailable: item.isAvailable,
      });

      res.json({ item, message: item.isAvailable ? 'Item available' : 'Item sold out' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update availability', message: error.message });
    }
  }
);

router.post(
  '/items/bulk-availability',
  authorize('admin', 'manager', 'kitchen'),
  [body('updates').isArray({ min: 1 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const items = await MenuItem.bulkUpdateAvailability(req.tenantId, req.body.updates);
      
      // Emit updates
      items.forEach(item => {
        emitMenuItemUpdate(req.tenantId, {
          itemId: item.id,
          name: item.name,
          isAvailable: item.isAvailable,
        });
      });

      res.json({ items, count: items.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update items', message: error.message });
    }
  }
);

router.delete(
  '/items/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await MenuItem.delete(req.tenantId, req.params.id);
      if (!success) return res.status(404).json({ error: 'Item not found' });
      res.json({ message: 'Item deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item', message: error.message });
    }
  }
);

module.exports = router;
