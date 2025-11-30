const QRCode = require('qrcode');
const config = require('../config');
const Table = require('../models/Table');

/**
 * QR Code Service
 * Generates QR codes for tables, menus, and ordering
 */
class QRCodeService {
  /**
   * Generate QR code for a table
   * @param {string} tenantId - Tenant UUID
   * @param {string} tableId - Table UUID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} QR code data
   */
  static async generateTableQR(tenantId, tableId, options = {}) {
    const table = await Table.findById(tenantId, tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const qrData = this.buildTableQRData(table, tenantId, options);
    const qrOptions = this.getQROptions(options);

    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(qrData.url, qrOptions);

    // Generate QR code as SVG (for printing)
    const svg = await QRCode.toString(qrData.url, { type: 'svg', ...qrOptions });

    return {
      tableId: table.id,
      tableNumber: table.tableNumber,
      qrToken: table.qrCodeToken,
      url: qrData.url,
      dataUrl,
      svg,
      printable: this.generatePrintableHTML(table, dataUrl, qrData),
    };
  }

  /**
   * Generate QR codes for all tables in a tenant
   * @param {string} tenantId - Tenant UUID
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of QR code data
   */
  static async generateAllTableQRs(tenantId, options = {}) {
    const tables = await Table.findByTenant(tenantId);
    
    const qrCodes = await Promise.all(
      tables.map(table => this.generateTableQR(tenantId, table.id, options))
    );

    return qrCodes;
  }

  /**
   * Generate QR code for menu access
   * @param {string} tenantId - Tenant UUID
   * @param {string} tenantSlug - Tenant slug
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} QR code data
   */
  static async generateMenuQR(tenantId, tenantSlug, options = {}) {
    const url = `${config.frontendUrl}/menu/${tenantSlug}`;
    const qrOptions = this.getQROptions(options);

    const dataUrl = await QRCode.toDataURL(url, qrOptions);
    const svg = await QRCode.toString(url, { type: 'svg', ...qrOptions });

    return {
      tenantId,
      type: 'menu',
      url,
      dataUrl,
      svg,
    };
  }

  /**
   * Build QR data for table ordering
   * @param {Object} table - Table data
   * @param {string} tenantId - Tenant UUID
   * @param {Object} options - Options
   * @returns {Object} QR data
   */
  static buildTableQRData(table, tenantId, options = {}) {
    // Build URL for guest ordering
    const baseUrl = options.baseUrl || config.frontendUrl;
    const url = `${baseUrl}/order/${table.qrCodeToken}`;

    return {
      url,
      token: table.qrCodeToken,
      tableId: table.id,
      tableNumber: table.tableNumber,
      tenantId,
    };
  }

  /**
   * Get QR code generation options
   * @param {Object} options - User options
   * @returns {Object} QRCode library options
   */
  static getQROptions(options = {}) {
    return {
      errorCorrectionLevel: options.errorCorrection || 'M',
      type: 'image/png',
      quality: 0.92,
      margin: options.margin || 2,
      width: options.width || 300,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#ffffff',
      },
    };
  }

  /**
   * Generate printable HTML for table QR code
   * @param {Object} table - Table data
   * @param {string} dataUrl - QR code data URL
   * @param {Object} qrData - QR data
   * @returns {string} HTML string
   */
  static generatePrintableHTML(table, dataUrl, qrData) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table ${table.tableNumber} QR Code</title>
  <style>
    @page { size: 80mm 120mm; margin: 5mm; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      text-align: center;
      padding: 10mm;
      margin: 0;
    }
    .qr-container {
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      background: white;
    }
    .table-number {
      font-size: 32px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .table-name {
      font-size: 16px;
      color: #666;
      margin-bottom: 15px;
    }
    .qr-code {
      width: 180px;
      height: 180px;
      margin: 0 auto 15px;
    }
    .instructions {
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }
    .wifi-info {
      font-size: 12px;
      color: #999;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #ddd;
    }
  </style>
</head>
<body>
  <div class="qr-container">
    <div class="table-number">Tisch ${table.tableNumber}</div>
    ${table.name ? `<div class="table-name">${table.name}</div>` : ''}
    <img class="qr-code" src="${dataUrl}" alt="QR Code">
    <div class="instructions">
      Scannen Sie den QR-Code<br>
      um zu bestellen
    </div>
    <div class="wifi-info">
      Scan the QR code to order
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate batch print HTML for multiple tables
   * @param {Array} qrCodes - Array of QR code data
   * @returns {string} HTML string
   */
  static generateBatchPrintHTML(qrCodes) {
    const qrItems = qrCodes.map(qr => `
      <div class="qr-item">
        <div class="table-number">Tisch ${qr.tableNumber}</div>
        <img class="qr-code" src="${qr.dataUrl}" alt="QR Code">
        <div class="instructions">Scannen um zu bestellen</div>
      </div>
    `).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>QR Codes - All Tables</title>
  <style>
    @page { size: A4; margin: 10mm; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10mm;
      padding: 5mm;
    }
    .qr-item {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      page-break-inside: avoid;
    }
    .table-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .qr-code {
      width: 120px;
      height: 120px;
    }
    .instructions {
      font-size: 11px;
      color: #666;
      margin-top: 8px;
    }
    @media print {
      .qr-item { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="qr-grid">
    ${qrItems}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Validate QR token and get table info
   * @param {string} qrToken - QR code token
   * @returns {Promise<Object|null>} Table data or null
   */
  static async validateQRToken(qrToken) {
    return Table.findByQRToken(qrToken);
  }
}

module.exports = QRCodeService;
