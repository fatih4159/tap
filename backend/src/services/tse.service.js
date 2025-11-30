const { query } = require('../config/db-connection');
const crypto = require('crypto');

/**
 * TSE (Technical Security Equipment) Service
 * Implements fiscalization requirements for German KassenSichV compliance
 * 
 * This is a MOCK implementation for development and testing.
 * In production, this should integrate with a certified TSE device/cloud service.
 * 
 * German regulations require:
 * - All transactions must be signed by a certified TSE
 * - Signatures must be stored and retrievable
 * - Export functionality for tax audits (DSFinV-K format)
 */

// Transaction types according to DSFinV-K
const TRANSACTION_TYPES = {
  SALE: 'Beleg', // Receipt
  CANCELLATION: 'Storno', // Cancellation
  TRAINING: 'Training', // Training mode
  VOID: 'AVBelegabbruch', // Void transaction
};

// Payment types
const PAYMENT_TYPES = {
  CASH: 'Bar',
  CARD: 'Karte',
  DIGITAL: 'Digital',
  CREDIT: 'Rechnung',
  OTHER: 'Sonstig',
};

class TSEService {
  constructor() {
    this.deviceId = process.env.TSE_DEVICE_ID || 'MOCK-TSE-001';
    this.isTestMode = process.env.NODE_ENV !== 'production';
    this.transactionCounter = 0;
  }

  /**
   * Start a TSE transaction
   * @param {string} tenantId - Tenant UUID
   * @param {string} orderId - Order UUID
   * @returns {Promise<Object>} Transaction start data
   */
  async startTransaction(tenantId, orderId) {
    const transactionId = this.generateTransactionId();
    const startTime = new Date().toISOString();

    // Log transaction start
    await this.logTSEEvent(tenantId, {
      type: 'START',
      transactionId,
      orderId,
      timestamp: startTime,
    });

    return {
      transactionId,
      startTime,
      deviceId: this.deviceId,
    };
  }

  /**
   * Sign and finalize a transaction
   * @param {string} tenantId - Tenant UUID
   * @param {Object} transactionData - Transaction data to sign
   * @returns {Promise<Object>} Signed transaction data
   */
  async signTransaction(tenantId, transactionData) {
    const {
      transactionId,
      orderId,
      items,
      totalAmount,
      taxAmounts,
      paymentType,
      transactionType = TRANSACTION_TYPES.SALE,
    } = transactionData;

    // Create the data to be signed (DSFinV-K format)
    const signatureData = this.createSignatureData({
      transactionId,
      orderId,
      items,
      totalAmount,
      taxAmounts,
      paymentType,
      transactionType,
    });

    // Generate mock signature (in production, this would come from TSE hardware/cloud)
    const signature = this.generateMockSignature(signatureData);
    const signatureCounter = ++this.transactionCounter;
    const endTime = new Date().toISOString();

    // Create TSE response
    const tseResponse = {
      transactionId,
      signatureCounter,
      signature,
      signatureAlgorithm: 'ecdsa-plain-SHA384', // DSFinV-K standard
      logTime: endTime,
      serialNumber: this.deviceId,
      publicKey: this.getMockPublicKey(),
      processType: transactionType,
      processData: signatureData,
    };

    // Store transaction in order
    await this.storeTransactionSignature(orderId, tseResponse);

    // Log transaction completion
    await this.logTSEEvent(tenantId, {
      type: 'FINISH',
      transactionId,
      orderId,
      signatureCounter,
      timestamp: endTime,
    });

    return {
      success: true,
      ...tseResponse,
      qrCode: this.generateQRCodeData(tseResponse),
    };
  }

  /**
   * Create signature data according to DSFinV-K format
   * @param {Object} data - Transaction data
   * @returns {string} Formatted signature data
   */
  createSignatureData(data) {
    const { transactionId, totalAmount, taxAmounts, transactionType } = data;

    // DSFinV-K format for processData
    // Format: processType^amount^vatRateNormal^vatRateReduced^vatRateSpecial^...
    const parts = [
      transactionType,
      totalAmount.toFixed(2),
      (taxAmounts?.normal || 0).toFixed(2),    // 19% VAT
      (taxAmounts?.reduced || 0).toFixed(2),    // 7% VAT
      '0.00', // Special VAT rates
      '0.00',
      '0.00',
    ];

    return parts.join('^');
  }

  /**
   * Generate mock signature (for development only)
   * @param {string} data - Data to sign
   * @returns {string} Mock signature
   */
  generateMockSignature(data) {
    if (!this.isTestMode) {
      throw new Error('Mock signatures not allowed in production');
    }

    // Generate a deterministic mock signature
    const hash = crypto.createHash('sha384').update(data).digest('hex');
    return `MOCK-${hash.substring(0, 64)}`;
  }

  /**
   * Get mock public key (for development only)
   * @returns {string} Mock public key
   */
  getMockPublicKey() {
    return 'MOCK-PK-' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate unique transaction ID
   * @returns {string} Transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `TSE-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Store transaction signature in order
   * @param {string} orderId - Order UUID
   * @param {Object} tseData - TSE response data
   */
  async storeTransactionSignature(orderId, tseData) {
    await query(
      `UPDATE orders SET 
        tse_signature = $1,
        tse_transaction_id = $2
       WHERE id = $3`,
      [tseData.signature, tseData.transactionId, orderId]
    );
  }

  /**
   * Log TSE event for audit trail
   * @param {string} tenantId - Tenant UUID
   * @param {Object} eventData - Event data
   */
  async logTSEEvent(tenantId, eventData) {
    // In production, this would be a separate audit log table
    console.log(`[TSE] ${tenantId}:`, JSON.stringify(eventData));
  }

  /**
   * Generate QR code data for receipt
   * DSFinV-K compliant QR code format
   * @param {Object} tseData - TSE response data
   * @returns {string} QR code data string
   */
  generateQRCodeData(tseData) {
    // DSFinV-K QR code format
    // V0;TSE-Serial;SignatureCounter;StartTime;EndTime;ProcessType;ProcessData;Signature
    const parts = [
      'V0', // Version
      tseData.serialNumber,
      tseData.signatureCounter.toString(),
      tseData.logTime,
      tseData.logTime,
      tseData.processType,
      tseData.processData,
      tseData.signature,
    ];

    return parts.join(';');
  }

  /**
   * Export transactions for tax audit (DSFinV-K format)
   * @param {string} tenantId - Tenant UUID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Export data
   */
  async exportTransactions(tenantId, startDate, endDate) {
    const result = await query(
      `SELECT o.*, oi.* FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.tenant_id = $1 
         AND o.created_at >= $2 
         AND o.created_at <= $3
         AND o.tse_signature IS NOT NULL
       ORDER BY o.created_at`,
      [tenantId, startDate, endDate]
    );

    // Format data according to DSFinV-K specification
    return {
      header: {
        version: '2.3',
        exportDate: new Date().toISOString(),
        tenantId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        deviceId: this.deviceId,
      },
      transactions: result.rows.map(row => ({
        transactionId: row.tse_transaction_id,
        signature: row.tse_signature,
        orderNumber: row.order_number,
        timestamp: row.created_at,
        totalAmount: row.total_amount,
        taxAmount: row.tax_amount,
      })),
      totalCount: result.rows.length,
    };
  }

  /**
   * Verify a TSE signature
   * @param {string} signature - Signature to verify
   * @param {string} data - Original data
   * @returns {boolean} Verification result
   */
  verifySignature(signature, data) {
    if (this.isTestMode && signature.startsWith('MOCK-')) {
      // Verify mock signature
      const expectedHash = crypto.createHash('sha384').update(data).digest('hex');
      return signature === `MOCK-${expectedHash.substring(0, 64)}`;
    }

    // In production, verify with actual TSE
    throw new Error('Production signature verification not implemented');
  }

  /**
   * Get TSE device status
   * @returns {Object} Device status
   */
  getDeviceStatus() {
    return {
      deviceId: this.deviceId,
      isTestMode: this.isTestMode,
      status: 'operational',
      transactionCount: this.transactionCounter,
      lastSync: new Date().toISOString(),
    };
  }
}

// Export singleton instance
module.exports = new TSEService();

// Export constants
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;
