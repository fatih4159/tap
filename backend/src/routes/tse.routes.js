const express = require('express');
const { body, query: queryValidator, validationResult } = require('express-validator');
const TSEService = require('../services/tse.service');
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
 * @route GET /api/tse/status
 * @desc Get TSE device status
 * @access Private (Admin/Manager)
 */
router.get(
  '/status',
  authorize('admin', 'manager'),
  (req, res) => {
    const status = TSEService.getDeviceStatus();
    res.json({ status });
  }
);

/**
 * @route POST /api/tse/start
 * @desc Start a TSE transaction
 * @access Private
 */
router.post(
  '/start',
  [body('orderId').isUUID().withMessage('Valid order ID required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId } = req.body;
      const transaction = await TSEService.startTransaction(req.tenantId, orderId);

      res.json({
        message: 'Transaction started',
        transaction,
      });
    } catch (error) {
      console.error('TSE start error:', error);
      res.status(500).json({
        error: 'Failed to start transaction',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/tse/sign
 * @desc Sign a transaction
 * @access Private
 */
router.post(
  '/sign',
  [
    body('transactionId').notEmpty().withMessage('Transaction ID required'),
    body('orderId').isUUID().withMessage('Valid order ID required'),
    body('totalAmount').isNumeric().withMessage('Total amount required'),
    body('paymentType')
      .isIn(['Bar', 'Karte', 'Digital', 'Rechnung', 'Sonstig'])
      .withMessage('Valid payment type required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { transactionId, orderId, items, totalAmount, taxAmounts, paymentType } = req.body;

      const result = await TSEService.signTransaction(req.tenantId, {
        transactionId,
        orderId,
        items,
        totalAmount: parseFloat(totalAmount),
        taxAmounts,
        paymentType,
      });

      res.json({
        message: 'Transaction signed',
        ...result,
      });
    } catch (error) {
      console.error('TSE sign error:', error);
      res.status(500).json({
        error: 'Failed to sign transaction',
        message: error.message,
      });
    }
  }
);

/**
 * @route GET /api/tse/export
 * @desc Export transactions for tax audit (DSFinV-K)
 * @access Private (Admin only)
 */
router.get(
  '/export',
  authorize('admin'),
  [
    queryValidator('startDate').isISO8601().withMessage('Valid start date required'),
    queryValidator('endDate').isISO8601().withMessage('Valid end date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const exportData = await TSEService.exportTransactions(
        req.tenantId,
        new Date(startDate),
        new Date(endDate)
      );

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dsfinvk-export-${startDate}-${endDate}.json"`
      );

      res.json(exportData);
    } catch (error) {
      console.error('TSE export error:', error);
      res.status(500).json({
        error: 'Failed to export transactions',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/tse/verify
 * @desc Verify a TSE signature
 * @access Private (Admin/Manager)
 */
router.post(
  '/verify',
  authorize('admin', 'manager'),
  [
    body('signature').notEmpty().withMessage('Signature required'),
    body('data').notEmpty().withMessage('Original data required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { signature, data } = req.body;
      const isValid = TSEService.verifySignature(signature, data);

      res.json({
        valid: isValid,
        signature: signature.substring(0, 20) + '...',
      });
    } catch (error) {
      console.error('TSE verify error:', error);
      res.status(500).json({
        error: 'Verification failed',
        message: error.message,
      });
    }
  }
);

module.exports = router;
