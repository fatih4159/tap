const PaymentGateway = require('./PaymentGateway');

/**
 * Stripe Payment Provider Implementation
 * Handles direct transaction processing via Stripe
 */
class StripePayment extends PaymentGateway {
  constructor(config = {}) {
    super(config);
    this.providerName = 'stripe';
    this.stripe = null;
  }

  async initialize() {
    if (!this.config.secretKey) {
      throw new Error('Stripe secret key is required');
    }

    const Stripe = require('stripe');
    this.stripe = new Stripe(this.config.secretKey);
  }

  async createPayment(params) {
    const {
      amount,
      currency = 'EUR',
      orderId,
      description,
      metadata = {},
      returnUrl,
      cancelUrl,
      paymentMethodTypes = ['card'],
    } = params;

    // Create a payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount, // Amount in cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        orderId,
        ...metadata,
      },
      payment_method_types: paymentMethodTypes,
      capture_method: 'automatic',
    });

    return {
      id: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: this.normalizeStatus(paymentIntent.status),
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      provider: this.providerName,
    };
  }

  async confirmPayment(paymentId) {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentId);

    return {
      id: paymentIntent.id,
      status: this.normalizeStatus(paymentIntent.status),
      provider: this.providerName,
    };
  }

  async cancelPayment(paymentId) {
    const paymentIntent = await this.stripe.paymentIntents.cancel(paymentId);

    return {
      id: paymentIntent.id,
      status: this.normalizeStatus(paymentIntent.status),
      provider: this.providerName,
    };
  }

  async refund(paymentId, amount = null, reason = '') {
    const refundParams = {
      payment_intent: paymentId,
      reason: this.mapRefundReason(reason),
    };

    if (amount) {
      refundParams.amount = amount;
    }

    const refund = await this.stripe.refunds.create(refundParams);

    return {
      id: refund.id,
      paymentId: refund.payment_intent,
      amount: refund.amount,
      status: refund.status,
      provider: this.providerName,
    };
  }

  async getPaymentStatus(paymentId) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentId);

    return {
      id: paymentIntent.id,
      status: this.normalizeStatus(paymentIntent.status),
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: paymentIntent.metadata,
      provider: this.providerName,
    };
  }

  async verifyWebhook(payload, signature) {
    if (!this.config.webhookSecret) {
      throw new Error('Stripe webhook secret is required');
    }

    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.webhookSecret
    );

    return event;
  }

  async processWebhook(event) {
    const { type, data } = event;

    switch (type) {
      case 'payment_intent.succeeded':
        return {
          type: 'payment.completed',
          paymentId: data.object.id,
          orderId: data.object.metadata?.orderId,
          amount: data.object.amount,
          currency: data.object.currency.toUpperCase(),
        };

      case 'payment_intent.payment_failed':
        return {
          type: 'payment.failed',
          paymentId: data.object.id,
          orderId: data.object.metadata?.orderId,
          error: data.object.last_payment_error?.message,
        };

      case 'charge.refunded':
        return {
          type: 'payment.refunded',
          paymentId: data.object.payment_intent,
          refundId: data.object.refunds?.data[0]?.id,
          amount: data.object.amount_refunded,
        };

      default:
        return { type: 'unknown', originalType: type };
    }
  }

  normalizeStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'authorized',
      canceled: 'cancelled',
      succeeded: 'completed',
    };

    return statusMap[stripeStatus] || 'unknown';
  }

  mapRefundReason(reason) {
    const reasonMap = {
      duplicate: 'duplicate',
      fraudulent: 'fraudulent',
      requested_by_customer: 'requested_by_customer',
    };

    return reasonMap[reason] || 'requested_by_customer';
  }
}

module.exports = StripePayment;
