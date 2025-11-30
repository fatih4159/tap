const express = require('express');
const { body, validationResult } = require('express-validator');
const BillingService = require('../services/billing.service');
const { authenticate, authorize } = require('../middleware/auth-middleware');
const { requireTenant } = require('../middleware/tenant-middleware');
const config = require('../config');

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
 * @route GET /api/billing/plans
 * @desc Get available subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  const plans = BillingService.getPlans();
  res.json({ plans });
});

/**
 * @route GET /api/billing/usage
 * @desc Get current usage for tenant
 * @access Private (Admin)
 */
router.get(
  '/usage',
  authenticate,
  requireTenant,
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      const usage = await BillingService.getCurrentUsage(req.tenantId);
      res.json({ usage });
    } catch (error) {
      console.error('Get usage error:', error);
      res.status(500).json({
        error: 'Failed to get usage',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/billing/subscribe
 * @desc Create a new subscription
 * @access Private (Admin)
 */
router.post(
  '/subscribe',
  authenticate,
  requireTenant,
  authorize('admin'),
  [
    body('plan')
      .isIn(['starter', 'professional', 'enterprise'])
      .withMessage('Invalid plan'),
    body('paymentMethodId')
      .notEmpty()
      .withMessage('Payment method required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { plan, paymentMethodId } = req.body;
      const subscription = await BillingService.createSubscription(
        req.tenantId,
        plan,
        paymentMethodId
      );

      res.status(201).json({
        message: 'Subscription created successfully',
        subscription,
      });
    } catch (error) {
      console.error('Subscribe error:', error);
      res.status(500).json({
        error: 'Failed to create subscription',
        message: error.message,
      });
    }
  }
);

/**
 * @route PUT /api/billing/subscription
 * @desc Update subscription plan
 * @access Private (Admin)
 */
router.put(
  '/subscription',
  authenticate,
  requireTenant,
  authorize('admin'),
  [
    body('plan')
      .isIn(['starter', 'professional', 'enterprise'])
      .withMessage('Invalid plan'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { plan } = req.body;
      const subscription = await BillingService.updateSubscription(req.tenantId, plan);

      res.json({
        message: 'Subscription updated successfully',
        subscription,
      });
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        error: 'Failed to update subscription',
        message: error.message,
      });
    }
  }
);

/**
 * @route DELETE /api/billing/subscription
 * @desc Cancel subscription
 * @access Private (Admin)
 */
router.delete(
  '/subscription',
  authenticate,
  requireTenant,
  authorize('admin'),
  async (req, res) => {
    try {
      const { immediate } = req.query;
      const result = await BillingService.cancelSubscription(
        req.tenantId,
        immediate !== 'true'
      );

      res.json({
        message: 'Subscription cancelled',
        ...result,
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({
        error: 'Failed to cancel subscription',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/billing/portal
 * @desc Create billing portal session
 * @access Private (Admin)
 */
router.post(
  '/portal',
  authenticate,
  requireTenant,
  authorize('admin'),
  [
    body('returnUrl')
      .isURL()
      .withMessage('Valid return URL required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { returnUrl } = req.body;
      const portalUrl = await BillingService.createBillingPortalSession(
        req.tenantId,
        returnUrl
      );

      res.json({ url: portalUrl });
    } catch (error) {
      console.error('Portal session error:', error);
      res.status(500).json({
        error: 'Failed to create portal session',
        message: error.message,
      });
    }
  }
);

/**
 * @route POST /api/billing/webhook
 * @desc Handle Stripe webhooks
 * @access Public (with signature verification)
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!config.stripe.webhookSecret) {
      console.warn('Stripe webhook secret not configured');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(config.stripe.secretKey);
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      await BillingService.handleWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

module.exports = router;
