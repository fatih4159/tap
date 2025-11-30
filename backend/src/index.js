const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const config = require('./config');
const { testConnection } = require('./config/db-connection');
const { tenantMiddleware } = require('./middleware/tenant-middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const syncRoutes = require('./routes/sync.routes');
const billingRoutes = require('./routes/billing.routes');
const paymentsRoutes = require('./routes/payments.routes');
const tseRoutes = require('./routes/tse.routes');
const tablesRoutes = require('./routes/tables.routes');
const menuRoutes = require('./routes/menu.routes');

// Import services
const { initializeSocket } = require('./services/socket.service');

// Create Express app
const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
  });
}

// Tenant middleware - extracts tenant context for all routes
app.use(tenantMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    version: require('../package.json').version,
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Gastro POS API',
    version: '1.0.0',
    tenant: req.tenant ? req.tenant.name : 'No tenant context',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/tse', tseRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/menu', menuRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : err.message;

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.warn('⚠️  Database connection failed. Server will start but some features may not work.');
    }

    // Initialize Socket.IO
    initializeSocket(server);

    server.listen(config.port, () => {
      console.log(`
🚀 Gastro POS Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${config.env}
🌐 URL: http://localhost:${config.port}
📊 Health: http://localhost:${config.port}/health
🔌 WebSocket: ws://localhost:${config.port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📤 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n📤 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server };
