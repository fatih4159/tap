const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const SyncService = require('../services/sync.service');
const { authenticate } = require('../middleware/auth-middleware');
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
 * @route POST /api/sync/bulk
 * @desc Process bulk sync operations from offline client
 * @access Private
 * 
 * Request body format:
 * {
 *   operations: [
 *     {
 *       clientId: "unique-client-generated-id",
 *       entityType: "order" | "order_item" | "table_status",
 *       operation: "create" | "update" | "delete",
 *       payload: { ... entity data ... },
 *       clientTimestamp: "2024-01-15T10:30:00.000Z"
 *     }
 *   ]
 * }
 */
router.post(
  '/bulk',
  [
    body('operations')
      .isArray({ min: 1, max: 100 })
      .withMessage('Operations must be an array with 1-100 items'),
    body('operations.*.clientId')
      .notEmpty()
      .withMessage('Each operation must have a clientId'),
    body('operations.*.entityType')
      .isIn(['order', 'order_item', 'table_status'])
      .withMessage('Invalid entity type'),
    body('operations.*.operation')
      .isIn(['create', 'update', 'delete'])
      .withMessage('Invalid operation type'),
    body('operations.*.payload')
      .isObject()
      .withMessage('Payload must be an object'),
    body('operations.*.clientTimestamp')
      .isISO8601()
      .withMessage('Client timestamp must be ISO 8601 format'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { operations } = req.body;
      const results = await SyncService.processBulkSync(req.tenantId, operations);

      res.json({
        message: 'Sync completed',
        results,
      });
    } catch (error) {
      console.error('Bulk sync error:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: 'An error occurred during synchronization',
      });
    }
  }
);

/**
 * @route GET /api/sync/changes
 * @desc Get changes since a given timestamp for client sync
 * @access Private
 * 
 * Query params:
 * - since: ISO 8601 timestamp
 */
router.get(
  '/changes',
  [
    queryValidator('since')
      .isISO8601()
      .withMessage('Since must be ISO 8601 timestamp'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { since } = req.query;
      const changes = await SyncService.getChangesSince(req.tenantId, since);

      res.json({
        message: 'Changes retrieved',
        changes,
      });
    } catch (error) {
      console.error('Get changes error:', error);
      res.status(500).json({
        error: 'Failed to get changes',
        message: 'An error occurred while fetching changes',
      });
    }
  }
);

/**
 * @route GET /api/sync/status
 * @desc Get sync status and pending operations count
 * @access Private
 */
router.get('/status', async (req, res) => {
  try {
    const pending = await SyncService.getPendingOperations(req.tenantId, 1);
    
    res.json({
      serverTimestamp: new Date().toISOString(),
      hasPendingOperations: pending.length > 0,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      message: 'An error occurred while checking sync status',
    });
  }
});

module.exports = router;
