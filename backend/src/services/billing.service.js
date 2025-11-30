const Stripe = require('stripe');
const config = require('../config');
const Tenant = require('../models/Tenant');
const { query } = require('../config/db-connection');

/**
 * Billing Service
 * Handles Stripe subscription management and usage-based billing
 * Supports two billing metrics: Order Count and Active User Count
 */

// Initialize Stripe
const stripe = config.stripe.secretKey 
  ? new Stripe(config.stripe.secretKey) 
  : null;

// Subscription plans configuration
const PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    features: ['Up to 500 orders/month', '3 staff accounts', 'Basic reports'],
    limits: { orders: 500, users: 3 },
  },
  professional: {
    name: 'Professional',
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional',
    features: ['Up to 2000 orders/month', '10 staff accounts', 'Advanced reports', 'API access'],
    limits: { orders: 2000, users: 10 },
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    features: ['Unlimited orders', 'Unlimited staff', 'Custom integrations', 'Priority support'],
    limits: { orders: Infinity, users: Infinity },
  },
};

class BillingService {
  /**
   * Create a Stripe customer for a new tenant
   * @param {Object} tenant - Tenant data
   * @returns {Promise<string>} Stripe customer ID
   */
  static async createCustomer(tenant) {
    if (!stripe) {
      console.warn('Stripe not configured, skipping customer creation');
      return null;
    }

    const customer = await stripe.customers.create({
      email: tenant.email,
      name: tenant.name,
      metadata: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    });

    // Update tenant with Stripe customer ID
    await Tenant.update(tenant.id, { stripeCustomerId: customer.id });

    return customer.id;
  }

  /**
   * Create a subscription for a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {string} planKey - Plan key (starter, professional, enterprise)
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Subscription details
   */
  static async createSubscription(tenantId, planKey, paymentMethodId) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const plan = PLANS[planKey];
    if (!plan) {
      throw new Error('Invalid plan');
    }

    let customerId = tenant.stripeCustomerId;

    // Create customer if not exists
    if (!customerId) {
      customerId = await this.createCustomer(tenant);
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.priceId }],
      metadata: {
        tenantId,
        planKey,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update tenant with subscription info
    await Tenant.update(tenantId, {
      stripeSubscriptionId: subscription.id,
      subscriptionPlan: planKey,
      subscriptionStatus: subscription.status === 'active' ? 'active' : 'past_due',
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: plan.name,
    };
  }

  /**
   * Update subscription plan
   * @param {string} tenantId - Tenant UUID
   * @param {string} newPlanKey - New plan key
   * @returns {Promise<Object>} Updated subscription
   */
  static async updateSubscription(tenantId, newPlanKey) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const plan = PLANS[newPlanKey];
    if (!plan) {
      throw new Error('Invalid plan');
    }

    const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);

    const updatedSubscription = await stripe.subscriptions.update(
      tenant.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: plan.priceId,
          },
        ],
        metadata: {
          planKey: newPlanKey,
        },
        proration_behavior: 'create_prorations',
      }
    );

    await Tenant.update(tenantId, { subscriptionPlan: newPlanKey });

    return {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      plan: plan.name,
    };
  }

  /**
   * Cancel subscription
   * @param {string} tenantId - Tenant UUID
   * @param {boolean} atPeriodEnd - Cancel at end of billing period
   * @returns {Promise<Object>} Cancellation result
   */
  static async cancelSubscription(tenantId, atPeriodEnd = true) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    let subscription;

    if (atPeriodEnd) {
      subscription = await stripe.subscriptions.update(
        tenant.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
    } else {
      subscription = await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
    }

    if (!atPeriodEnd) {
      await Tenant.update(tenantId, { subscriptionStatus: 'cancelled' });
    }

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  }

  /**
   * Create billing portal session for customer self-service
   * @param {string} tenantId - Tenant UUID
   * @param {string} returnUrl - URL to return to after portal
   * @returns {Promise<string>} Portal URL
   */
  static async createBillingPortalSession(tenantId, returnUrl) {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.stripeCustomerId) {
      throw new Error('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Record usage metrics for billing
   * @param {string} tenantId - Tenant UUID
   * @param {string} metricType - 'orders' or 'active_users'
   * @param {number} value - Metric value
   * @returns {Promise<void>}
   */
  static async recordUsage(tenantId, metricType, value) {
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Upsert usage metric
    await query(
      `INSERT INTO usage_metrics (tenant_id, metric_type, metric_value, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, metric_type, period_start)
       DO UPDATE SET metric_value = $3, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, metricType, value, periodStart, periodEnd]
    );
  }

  /**
   * Get current usage for a tenant
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<Object>} Usage data
   */
  static async getCurrentUsage(tenantId) {
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const result = await query(
      `SELECT metric_type, metric_value 
       FROM usage_metrics 
       WHERE tenant_id = $1 AND period_start = $2`,
      [tenantId, periodStart]
    );

    const usage = {
      orders: 0,
      activeUsers: 0,
      periodStart,
      periodEnd: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };

    result.rows.forEach((row) => {
      if (row.metric_type === 'orders') {
        usage.orders = row.metric_value;
      } else if (row.metric_type === 'active_users') {
        usage.activeUsers = row.metric_value;
      }
    });

    // Get plan limits
    const tenant = await Tenant.findById(tenantId);
    const plan = PLANS[tenant.subscriptionPlan] || PLANS.starter;

    return {
      ...usage,
      limits: plan.limits,
      plan: plan.name,
    };
  }

  /**
   * Report usage to Stripe (for usage-based billing)
   * @param {string} tenantId - Tenant UUID
   * @returns {Promise<void>}
   */
  static async reportUsageToStripe(tenantId) {
    if (!stripe) {
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || !tenant.stripeSubscriptionId) {
      return;
    }

    const usage = await this.getCurrentUsage(tenantId);

    // Get subscription items
    const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
    const subscriptionItemId = subscription.items.data[0]?.id;

    if (!subscriptionItemId) {
      return;
    }

    // Report order count as usage
    await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity: usage.orders,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'set',
    });

    // Mark as reported
    const periodStart = new Date(usage.periodStart);
    await query(
      `UPDATE usage_metrics 
       SET reported_to_stripe = true 
       WHERE tenant_id = $1 AND period_start = $2`,
      [tenantId, periodStart]
    );
  }

  /**
   * Handle Stripe webhook events
   * @param {Object} event - Stripe event
   * @returns {Promise<void>}
   */
  static async handleWebhook(event) {
    const { type, data } = event;

    switch (type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(data.object);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data.object);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(data.object);
        break;

      default:
        console.log(`Unhandled webhook event: ${type}`);
    }
  }

  /**
   * Handle subscription updated event
   * @param {Object} subscription - Stripe subscription object
   */
  static async handleSubscriptionUpdated(subscription) {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    const statusMap = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'suspended',
    };

    await Tenant.update(tenantId, {
      subscriptionStatus: statusMap[subscription.status] || 'active',
    });
  }

  /**
   * Handle subscription deleted event
   * @param {Object} subscription - Stripe subscription object
   */
  static async handleSubscriptionDeleted(subscription) {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    await Tenant.update(tenantId, {
      subscriptionStatus: 'cancelled',
      stripeSubscriptionId: null,
    });
  }

  /**
   * Handle payment failed event
   * @param {Object} invoice - Stripe invoice object
   */
  static async handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    const tenant = await Tenant.findByStripeCustomerId(customerId);
    
    if (tenant) {
      await Tenant.update(tenant.id, { subscriptionStatus: 'past_due' });
    }
  }

  /**
   * Handle payment succeeded event
   * @param {Object} invoice - Stripe invoice object
   */
  static async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    const tenant = await Tenant.findByStripeCustomerId(customerId);
    
    if (tenant && tenant.subscriptionStatus === 'past_due') {
      await Tenant.update(tenant.id, { subscriptionStatus: 'active' });
    }
  }

  /**
   * Get available plans
   * @returns {Object} Plans configuration
   */
  static getPlans() {
    return PLANS;
  }
}

module.exports = BillingService;
