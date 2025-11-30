/**
 * Payment Gateway Interface
 * Abstract base class defining the contract for all payment providers
 */
class PaymentGateway {
  constructor(config = {}) {
    this.config = config;
    this.providerName = 'abstract';
  }

  /**
   * Initialize the payment provider
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Create a payment intent/session for a transaction
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in cents
   * @param {string} params.currency - Currency code (e.g., 'EUR')
   * @param {string} params.orderId - Order reference
   * @param {string} params.description - Payment description
   * @param {Object} params.metadata - Additional metadata
   * @param {string} params.returnUrl - URL for redirect after payment
   * @param {string} params.cancelUrl - URL for cancelled payments
   * @returns {Promise<Object>} Payment intent/session data
   */
  async createPayment(params) {
    throw new Error('Method createPayment() must be implemented');
  }

  /**
   * Confirm/capture a payment
   * @param {string} paymentId - Payment/intent ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmPayment(paymentId) {
    throw new Error('Method confirmPayment() must be implemented');
  }

  /**
   * Cancel a payment
   * @param {string} paymentId - Payment/intent ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelPayment(paymentId) {
    throw new Error('Method cancelPayment() must be implemented');
  }

  /**
   * Process a refund
   * @param {string} paymentId - Payment/intent ID
   * @param {number} amount - Refund amount in cents (null for full refund)
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async refund(paymentId, amount = null, reason = '') {
    throw new Error('Method refund() must be implemented');
  }

  /**
   * Get payment status
   * @param {string} paymentId - Payment/intent ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(paymentId) {
    throw new Error('Method getPaymentStatus() must be implemented');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {Promise<Object>} Verified event
   */
  async verifyWebhook(payload, signature) {
    throw new Error('Method verifyWebhook() must be implemented');
  }

  /**
   * Process webhook event
   * @param {Object} event - Webhook event
   * @returns {Promise<Object>} Processing result
   */
  async processWebhook(event) {
    throw new Error('Method processWebhook() must be implemented');
  }

  /**
   * Normalize payment status to common format
   * @param {string} providerStatus - Provider-specific status
   * @returns {string} Normalized status
   */
  normalizeStatus(providerStatus) {
    // Override in implementations
    return providerStatus;
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    return this.providerName;
  }
}

module.exports = PaymentGateway;
