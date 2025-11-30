const StripePayment = require('./StripePayment');
const MolliePayment = require('./MolliePayment');
const PayPalPayment = require('./PayPalPayment');
const config = require('../../config');

/**
 * Payment Service Factory
 * Provides a unified interface for different payment providers
 */

// Available providers
const providers = {
  stripe: StripePayment,
  mollie: MolliePayment,
  paypal: PayPalPayment,
};

// Cached provider instances
const instances = new Map();

/**
 * Get or create a payment provider instance
 * @param {string} providerName - Provider name (stripe, mollie, paypal)
 * @param {Object} providerConfig - Provider-specific configuration
 * @returns {Promise<PaymentGateway>} Initialized payment provider
 */
const getProvider = async (providerName, providerConfig = {}) => {
  const cacheKey = `${providerName}:${JSON.stringify(providerConfig)}`;

  if (instances.has(cacheKey)) {
    return instances.get(cacheKey);
  }

  const ProviderClass = providers[providerName];
  if (!ProviderClass) {
    throw new Error(`Unknown payment provider: ${providerName}`);
  }

  // Merge default config with provider-specific config
  const mergedConfig = getMergedConfig(providerName, providerConfig);

  const provider = new ProviderClass(mergedConfig);
  await provider.initialize();

  instances.set(cacheKey, provider);
  return provider;
};

/**
 * Get merged configuration for a provider
 * @param {string} providerName - Provider name
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} Merged configuration
 */
const getMergedConfig = (providerName, overrides) => {
  const defaultConfigs = {
    stripe: {
      secretKey: config.stripe.secretKey,
      webhookSecret: config.stripe.webhookSecret,
    },
    mollie: {
      apiKey: process.env.MOLLIE_API_KEY,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      sandbox: config.env !== 'production',
    },
  };

  return { ...defaultConfigs[providerName], ...overrides };
};

/**
 * Create a payment using the specified provider
 * @param {string} providerName - Provider name
 * @param {Object} paymentParams - Payment parameters
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Payment result
 */
const createPayment = async (providerName, paymentParams, providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  return provider.createPayment(paymentParams);
};

/**
 * Confirm a payment
 * @param {string} providerName - Provider name
 * @param {string} paymentId - Payment ID
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Confirmation result
 */
const confirmPayment = async (providerName, paymentId, providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  return provider.confirmPayment(paymentId);
};

/**
 * Cancel a payment
 * @param {string} providerName - Provider name
 * @param {string} paymentId - Payment ID
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Cancellation result
 */
const cancelPayment = async (providerName, paymentId, providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  return provider.cancelPayment(paymentId);
};

/**
 * Process a refund
 * @param {string} providerName - Provider name
 * @param {string} paymentId - Payment ID
 * @param {number} amount - Refund amount in cents (null for full refund)
 * @param {string} reason - Refund reason
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Refund result
 */
const refundPayment = async (providerName, paymentId, amount = null, reason = '', providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  return provider.refund(paymentId, amount, reason);
};

/**
 * Get payment status
 * @param {string} providerName - Provider name
 * @param {string} paymentId - Payment ID
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Payment status
 */
const getPaymentStatus = async (providerName, paymentId, providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  return provider.getPaymentStatus(paymentId);
};

/**
 * Process a webhook event
 * @param {string} providerName - Provider name
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature
 * @param {Object} providerConfig - Optional provider configuration
 * @returns {Promise<Object>} Processed event
 */
const processWebhook = async (providerName, payload, signature, providerConfig = {}) => {
  const provider = await getProvider(providerName, providerConfig);
  const event = await provider.verifyWebhook(payload, signature);
  return provider.processWebhook(event);
};

/**
 * Get list of available providers
 * @returns {Array<string>} Provider names
 */
const getAvailableProviders = () => {
  return Object.keys(providers);
};

/**
 * Check if a provider is configured
 * @param {string} providerName - Provider name
 * @returns {boolean} True if provider is configured
 */
const isProviderConfigured = (providerName) => {
  switch (providerName) {
    case 'stripe':
      return !!config.stripe.secretKey;
    case 'mollie':
      return !!process.env.MOLLIE_API_KEY;
    case 'paypal':
      return !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;
    default:
      return false;
  }
};

module.exports = {
  getProvider,
  createPayment,
  confirmPayment,
  cancelPayment,
  refundPayment,
  getPaymentStatus,
  processWebhook,
  getAvailableProviders,
  isProviderConfigured,
  // Export classes for custom instantiation
  StripePayment,
  MolliePayment,
  PayPalPayment,
};
