const PaymentGateway = require('./PaymentGateway');

/**
 * Mollie Payment Provider Implementation
 * Popular in Europe, especially Netherlands and Germany
 */
class MolliePayment extends PaymentGateway {
  constructor(config = {}) {
    super(config);
    this.providerName = 'mollie';
    this.client = null;
    this.baseUrl = 'https://api.mollie.com/v2';
  }

  async initialize() {
    if (!this.config.apiKey) {
      throw new Error('Mollie API key is required');
    }

    // Mollie SDK would be used here, but for now we'll use fetch
    // In production, install @mollie/api-client
    this.apiKey = this.config.apiKey;
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
    } = params;

    // Convert cents to decimal string (Mollie format)
    const amountValue = (amount / 100).toFixed(2);

    const response = await this.makeRequest('POST', '/payments', {
      amount: {
        currency: currency.toUpperCase(),
        value: amountValue,
      },
      description: description || `Order ${orderId}`,
      redirectUrl: returnUrl,
      cancelUrl: cancelUrl,
      metadata: {
        orderId,
        ...metadata,
      },
    });

    return {
      id: response.id,
      checkoutUrl: response._links?.checkout?.href,
      status: this.normalizeStatus(response.status),
      amount: amount,
      currency: currency.toUpperCase(),
      provider: this.providerName,
    };
  }

  async confirmPayment(paymentId) {
    // Mollie payments are confirmed via redirect flow
    // Just retrieve status
    return this.getPaymentStatus(paymentId);
  }

  async cancelPayment(paymentId) {
    const response = await this.makeRequest('DELETE', `/payments/${paymentId}`);

    return {
      id: paymentId,
      status: 'cancelled',
      provider: this.providerName,
    };
  }

  async refund(paymentId, amount = null, reason = '') {
    const refundData = {
      description: reason || 'Refund',
    };

    if (amount) {
      const payment = await this.getPaymentStatus(paymentId);
      refundData.amount = {
        currency: payment.currency,
        value: (amount / 100).toFixed(2),
      };
    }

    const response = await this.makeRequest(
      'POST',
      `/payments/${paymentId}/refunds`,
      refundData
    );

    return {
      id: response.id,
      paymentId: paymentId,
      amount: Math.round(parseFloat(response.amount.value) * 100),
      status: response.status,
      provider: this.providerName,
    };
  }

  async getPaymentStatus(paymentId) {
    const response = await this.makeRequest('GET', `/payments/${paymentId}`);

    return {
      id: response.id,
      status: this.normalizeStatus(response.status),
      amount: Math.round(parseFloat(response.amount.value) * 100),
      currency: response.amount.currency,
      metadata: response.metadata,
      provider: this.providerName,
    };
  }

  async verifyWebhook(payload, signature) {
    // Mollie webhooks don't use signatures, but verify by fetching payment
    const { id: paymentId } = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (!paymentId) {
      throw new Error('Invalid webhook payload');
    }

    const payment = await this.getPaymentStatus(paymentId);
    return { payment };
  }

  async processWebhook(event) {
    const { payment } = event;

    if (!payment) {
      return { type: 'unknown' };
    }

    switch (payment.status) {
      case 'completed':
        return {
          type: 'payment.completed',
          paymentId: payment.id,
          orderId: payment.metadata?.orderId,
          amount: payment.amount,
          currency: payment.currency,
        };

      case 'cancelled':
      case 'expired':
      case 'failed':
        return {
          type: 'payment.failed',
          paymentId: payment.id,
          orderId: payment.metadata?.orderId,
          status: payment.status,
        };

      default:
        return {
          type: 'payment.updated',
          paymentId: payment.id,
          status: payment.status,
        };
    }
  }

  normalizeStatus(mollieStatus) {
    const statusMap = {
      open: 'pending',
      pending: 'processing',
      authorized: 'authorized',
      paid: 'completed',
      canceled: 'cancelled',
      expired: 'expired',
      failed: 'failed',
    };

    return statusMap[mollieStatus] || 'unknown';
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Mollie API error: ${response.status}`);
    }

    if (method === 'DELETE') {
      return { success: true };
    }

    return response.json();
  }
}

module.exports = MolliePayment;
