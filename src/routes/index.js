const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const healthRoutes = require('./health');
const clientRoutes = require('./clients');
const developmentRoutes = require('./developments');
const productionOrders = require('./productionOrders');
const productionSheets = require('./productionSheets');

const router = express.Router();

// Rota de status da API
router.get('/', (req, res) => {
  res.json({
    message: 'TW-System API v1',
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/auth',
      users: '/users',
      clients: '/clients'
    }
  });
});

// Rotas da aplicação
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/developments', developmentRoutes);
router.use('/production-orders', productionOrders);
router.use('/production-sheets', productionSheets);

module.exports = router;