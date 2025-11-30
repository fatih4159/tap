const PaymentGateway = require('./PaymentGateway');

/**
 * PayPal Payment Provider Implementation
 * Uses PayPal REST API for processing payments
 */
class PayPalPayment extends PaymentGateway {
  constructor(config = {}) {
    super(config);
    this.providerName = 'paypal';
    this.baseUrl = config.sandbox 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async initialize() {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('PayPal client ID and secret are required');
    }

    await this.getAccessToken();
  }

  async getAccessToken() {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer

    return this.accessToken;
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

    // Convert cents to decimal string
    const amountValue = (amount / 100).toFixed(2);

    const response = await this.makeRequest('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: orderId,
          description: description || `Order ${orderId}`,
          amount: {
            currency_code: currency.toUpperCase(),
            value: amountValue,
          },
          custom_id: JSON.stringify(metadata),
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: this.config.brandName || 'Gastro POS',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    });

    // Find approval URL
    const approvalLink = response.links?.find(link => link.rel === 'approve');

    return {
      id: response.id,
      checkoutUrl: approvalLink?.href,
      status: this.normalizeStatus(response.status),
      amount: amount,
      currency: currency.toUpperCase(),
      provider: this.providerName,
    };
  }

  async confirmPayment(paymentId) {
    // Capture the order
    const response = await this.makeRequest(
      'POST',
      `/v2/checkout/orders/${paymentId}/capture`
    );

    const capture = response.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      id: paymentId,
      captureId: capture?.id,
      status: this.normalizeStatus(response.status),
      provider: this.providerName,
    };
  }

  async cancelPayment(paymentId) {
    // PayPal orders expire automatically, but we can void authorized payments
    // For checkout orders, they just need to not be captured
    return {
      id: paymentId,
      status: 'cancelled',
      provider: this.providerName,
    };
  }

  async refund(paymentId, amount = null, reason = '') {
    // For PayPal, we need the capture ID
    const order = await this.getPaymentStatus(paymentId);
    
    // Get capture ID from the completed order
    // In real implementation, you'd store the capture ID when confirming
    const captureId = order.captureId;

    if (!captureId) {
      throw new Error('No capture found for this order');
    }

    const refundData = {
      note_to_payer: reason || 'Refund',
    };

    if (amount) {
      refundData.amount = {
        currency_code: order.currency,
        value: (amount / 100).toFixed(2),
      };
    }

    const response = await this.makeRequest(
      'POST',
      `/v2/payments/captures/${captureId}/refund`,
      refundData
    );

    return {
      id: response.id,
      paymentId: paymentId,
      amount: amount || order.amount,
      status: response.status.toLowerCase(),
      provider: this.providerName,
    };
  }

  async getPaymentStatus(paymentId) {
    const response = await this.makeRequest('GET', `/v2/checkout/orders/${paymentId}`);

    const purchaseUnit = response.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const amountValue = purchaseUnit?.amount?.value || '0';

    return {
      id: response.id,
      captureId: capture?.id,
      status: this.normalizeStatus(response.status),
      amount: Math.round(parseFloat(amountValue) * 100),
      currency: purchaseUnit?.amount?.currency_code || 'EUR',
      metadata: this.parseMetadata(purchaseUnit?.custom_id),
      provider: this.providerName,
    };
  }

  async verifyWebhook(payload, signature) {
    // PayPal webhook verification requires additional headers
    // In production, implement full verification
    const webhookId = this.config.webhookId;

    if (!webhookId) {
      console.warn('PayPal webhook ID not configured, skipping verification');
      return typeof payload === 'string' ? JSON.parse(payload) : payload;
    }

    // Implement PayPal webhook signature verification here
    return typeof payload === 'string' ? JSON.parse(payload) : payload;
  }

  async processWebhook(event) {
    const { event_type, resource } = event;

    switch (event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        return {
          type: 'payment.approved',
          paymentId: resource.id,
          orderId: resource.purchase_units?.[0]?.reference_id,
        };

      case 'PAYMENT.CAPTURE.COMPLETED':
        return {
          type: 'payment.completed',
          paymentId: resource.supplementary_data?.related_ids?.order_id,
          captureId: resource.id,
          amount: Math.round(parseFloat(resource.amount?.value || 0) * 100),
          currency: resource.amount?.currency_code,
        };

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        return {
          type: 'payment.failed',
          paymentId: resource.supplementary_data?.related_ids?.order_id,
          captureId: resource.id,
        };

      case 'PAYMENT.CAPTURE.REFUNDED':
        return {
          type: 'payment.refunded',
          captureId: resource.id,
          amount: Math.round(parseFloat(resource.amount?.value || 0) * 100),
        };

      default:
        return { type: 'unknown', originalType: event_type };
    }
  }

  normalizeStatus(paypalStatus) {
    const statusMap = {
      CREATED: 'pending',
      SAVED: 'pending',
      APPROVED: 'authorized',
      VOIDED: 'cancelled',
      COMPLETED: 'completed',
      PAYER_ACTION_REQUIRED: 'pending',
    };

    return statusMap[paypalStatus] || 'unknown';
  }

  parseMetadata(customId) {
    try {
      return customId ? JSON.parse(customId) : {};
    } catch {
      return {};
    }
  }

  async makeRequest(method, endpoint, data = null) {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `PayPal API error: ${response.status}`);
    }

    return response.json();
  }
}

module.exports = PayPalPayment;
