const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Table = require('../models/Table');
const QRCodeService = require('../services/qrcode.service');
const { authenticate, authorize } = require('../middleware/auth-middleware');
const { requireTenant } = require('../middleware/tenant-middleware');
const { emitTableStatusUpdate } = require('../services/socket.service');

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation Error', details: errors.array() });
  }
  next();
};

// All routes require auth except QR validation
router.use(authenticate);
router.use(requireTenant);

// =====================
// FLOORS
// =====================

router.get('/floors', async (req, res) => {
  try {
    const floors = await Table.getFloors(req.tenantId);
    res.json({ floors });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get floors', message: error.message });
  }
});

router.post(
  '/floors',
  authorize('admin', 'manager'),
  [body('name').notEmpty().withMessage('Floor name required')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const floor = await Table.createFloor(req.tenantId, req.body);
      res.status(201).json({ floor });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create floor', message: error.message });
    }
  }
);

router.put(
  '/floors/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const floor = await Table.updateFloor(req.tenantId, req.params.id, req.body);
      if (!floor) return res.status(404).json({ error: 'Floor not found' });
      res.json({ floor });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update floor', message: error.message });
    }
  }
);

router.delete(
  '/floors/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await Table.deleteFloor(req.tenantId, req.params.id);
      if (!success) return res.status(404).json({ error: 'Floor not found' });
      res.json({ message: 'Floor deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete floor', message: error.message });
    }
  }
);

// =====================
// ROOMS
// =====================

router.get('/rooms', async (req, res) => {
  try {
    const rooms = await Table.getRooms(req.tenantId, req.query.floorId);
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rooms', message: error.message });
  }
});

router.post(
  '/rooms',
  authorize('admin', 'manager'),
  [
    body('floorId').isUUID().withMessage('Floor ID required'),
    body('name').notEmpty().withMessage('Room name required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const room = await Table.createRoom(req.tenantId, req.body);
      res.status(201).json({ room });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create room', message: error.message });
    }
  }
);

router.put(
  '/rooms/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const room = await Table.updateRoom(req.tenantId, req.params.id, req.body);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.json({ room });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update room', message: error.message });
    }
  }
);

router.delete(
  '/rooms/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await Table.deleteRoom(req.tenantId, req.params.id);
      if (!success) return res.status(404).json({ error: 'Room not found' });
      res.json({ message: 'Room deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete room', message: error.message });
    }
  }
);

// =====================
// TABLES
// =====================

router.get('/', async (req, res) => {
  try {
    const { roomId, status } = req.query;
    const tables = await Table.findByTenant(req.tenantId, { roomId, status });
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tables', message: error.message });
  }
});

router.get('/layout', async (req, res) => {
  try {
    const layout = await Table.getFullLayout(req.tenantId);
    res.json({ layout });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get layout', message: error.message });
  }
});

router.get('/:id', [param('id').isUUID()], handleValidationErrors, async (req, res) => {
  try {
    const table = await Table.findById(req.tenantId, req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json({ table });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get table', message: error.message });
  }
});

router.post(
  '/',
  authorize('admin', 'manager'),
  [
    body('tableNumber').notEmpty().withMessage('Table number required'),
    body('capacity').optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const table = await Table.create(req.tenantId, req.body);
      res.status(201).json({ table });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Table number already exists' });
      }
      res.status(500).json({ error: 'Failed to create table', message: error.message });
    }
  }
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const table = await Table.update(req.tenantId, req.params.id, req.body);
      if (!table) return res.status(404).json({ error: 'Table not found' });
      res.json({ table });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update table', message: error.message });
    }
  }
);

router.patch(
  '/:id/status',
  [
    param('id').isUUID(),
    body('status').isIn(['available', 'occupied', 'reserved', 'cleaning']),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const table = await Table.updateStatus(req.tenantId, req.params.id, req.body.status);
      if (!table) return res.status(404).json({ error: 'Table not found' });
      
      // Emit real-time update
      emitTableStatusUpdate(req.tenantId, {
        tableId: table.id,
        tableNumber: table.tableNumber,
        status: table.status,
      });
      
      res.json({ table });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update status', message: error.message });
    }
  }
);

router.delete(
  '/:id',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await Table.delete(req.tenantId, req.params.id);
      if (!success) return res.status(404).json({ error: 'Table not found' });
      res.json({ message: 'Table deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete table', message: error.message });
    }
  }
);

// =====================
// QR CODES
// =====================

router.get('/:id/qr', [param('id').isUUID()], handleValidationErrors, async (req, res) => {
  try {
    const qr = await QRCodeService.generateTableQR(req.tenantId, req.params.id, req.query);
    res.json({ qr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR', message: error.message });
  }
});

router.post(
  '/:id/qr/regenerate',
  authorize('admin', 'manager'),
  [param('id').isUUID()],
  handleValidationErrors,
  async (req, res) => {
    try {
      const table = await Table.regenerateQRToken(req.tenantId, req.params.id);
      if (!table) return res.status(404).json({ error: 'Table not found' });
      res.json({ table, message: 'QR token regenerated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to regenerate QR', message: error.message });
    }
  }
);

router.get('/qr/all', authorize('admin', 'manager'), async (req, res) => {
  try {
    const qrCodes = await QRCodeService.generateAllTableQRs(req.tenantId, req.query);
    const printableHTML = QRCodeService.generateBatchPrintHTML(qrCodes);
    res.json({ qrCodes, printableHTML });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR codes', message: error.message });
  }
});

module.exports = router;
