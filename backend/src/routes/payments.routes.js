const express = require('express');
const { body, param, validationResult } = require('express-validator');
const PaymentService = require('../services/payment');
const { authenticate, optionalAuth } = require('../middleware/auth-middleware');
const { requireTenant } = require('../middleware/tenant-middleware');
const { query } = require('../config/db-connection');

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
 * @route GET /api/payments/providers
 * @desc Get available payment providers
 * @access Public
 */
router.get('/providers', (req, res) => {
  const providers = PaymentService.getAvailableProviders();
  const configuredProviders = providers.filter(p => PaymentService.isProviderConfigured(p));

  res.json({
    providers: configuredProviders,
    all: providers,
  });
});

/**
 * @route POST /api/payments/create
 * @desc Create a payment for an order
 * @access Private or Guest (with tenant context)
 */
router.post(
  '/create',
  requireTenant,
  optionalAuth,
  [
    body('orderId').isUUID().withMessage('Valid order ID required'),
    body('provider')
      .isIn(['stripe', 'mollie', 'paypal'])
      .withMessage('Valid provider required'),
    body('returnUrl').isURL().withMessage('Valid return URL required'),
    body('cancelUrl').isURL().withMessage('Valid cancel URL required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { orderId, provider, returnUrl, cancelUrl } = req.body;

      // Get order details
      const orderResult = await query(
        'SELECT * FROM orders WHERE tenant_id = $1 AND id = $2',
        [req.tenantId, orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Order not found',
          message: 'The specified order does not exist',
        });
      }

      const order = orderResult.rows[0];

      if (order.payment_status === 'paid') {
        return res.status(400).json({
          error: 'Already paid',
          message: 'This order has already been paid',
        });
      }

      // Check if provider is configured
      if (!PaymentService.isProviderConfigured(provider)) {
        return res.status(400).json({
          error: 'Provider not configured',
          message: `Payment provider ${provider} is not configured`,
        });
      }

      // Create payment
      const payment = await PaymentService.createPayment(provider, {
        amount: Math.round(order.total_amount * 100), // Convert to cents
        currency: 'EUR',
        orderId: order.id,
        description: `Order ${order.order_number}`,
        metadata: {
          tenantId: req.tenantId,
          orderNumber: order.order_number,
        },
        returnUrl,
        cancelUrl,
      });

      // Store payment reference in order metadata
      const metadata = {
        ...order.metadata,
        paymentProvider: provider,
        paymentId: payment.id,
      };

      await query(
        'UPDATE orders SET metadata = $1 WHERE id = $2',
        [JSON.stringify(metadata), orderId]
      );

      res.json({
        payment,
        orderId,
      });
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({
        error: 'Payment creation failed',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/payments/:paymentId/confirm
 * @desc Confirm a payment (for providers that need manual confirmation)
 * @access Private
 */
router.post(
  '/:paymentId/confirm',
  authenticate,
  requireTenant,
  [param('paymentId').notEmpty().withMessage('Payment ID required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({
          error: 'Provider required',
          message: 'Payment provider must be specified',
        });
      }

      const result = await PaymentService.confirmPayment(provider, paymentId);

      res.json({
        message: 'Payment confirmed',
        ...result,
      });
    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({
        error: 'Payment confirmation failed',
        message: error.message,
      });
    }
  }
);

/**
 * @route GET /api/payments/:paymentId/status
 * @desc Get payment status
 * @access Private
 */
router.get(
  '/:paymentId/status',
  authenticate,
  requireTenant,
  [param('paymentId').notEmpty().withMessage('Payment ID required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { provider } = req.query;

      if (!provider) {
        return res.status(400).json({
          error: 'Provider required',
          message: 'Payment provider must be specified',
        });
      }

      const status = await PaymentService.getPaymentStatus(provider, paymentId);

      res.json({ status });
    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        error: 'Failed to get status',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/payments/:paymentId/refund
 * @desc Refund a payment
 * @access Private (Admin/Manager)
 */
router.post(
  '/:paymentId/refund',
  authenticate,
  requireTenant,
  [
    param('paymentId').notEmpty().withMessage('Payment ID required'),
    body('provider')
      .isIn(['stripe', 'mollie', 'paypal'])
      .withMessage('Valid provider required'),
    body('amount').optional().isInt({ min: 1 }).withMessage('Amount must be positive'),
    body('reason').optional().isString(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check authorization
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only managers can process refunds',
        });
      }

      const { paymentId } = req.params;
      const { provider, amount, reason } = req.body;

      const refund = await PaymentService.refundPayment(provider, paymentId, amount, reason);

      res.json({
        message: 'Refund processed',
        refund,
      });
    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({
        error: 'Refund failed',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/payments/webhook/:provider
 * @desc Handle payment provider webhooks
 * @access Public (with signature verification)
 */
router.post(
  '/webhook/:provider',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const { provider } = req.params;
      const signature = req.headers['stripe-signature'] || 
                       req.headers['x-mollie-signature'] ||
                       req.headers['paypal-transmission-sig'];

      const event = await PaymentService.processWebhook(
        provider,
        req.body,
        signature
      );

      // Handle the event
      if (event.type === 'payment.completed' && event.orderId) {
        // Update order payment status
        await query(
          `UPDATE orders SET payment_status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_method = $1
           WHERE id = $2`,
          [provider, event.orderId]
        );
      }

      res.json({ received: true, event: event.type });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        error: 'Webhook processing failed',
        message: error.message,
      });
    }
  }
);

module.exports = router;
