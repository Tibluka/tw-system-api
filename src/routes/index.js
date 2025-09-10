const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const healthRoutes = require('./health');

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
      users: '/users'
    }
  });
});

// Rotas da aplicação
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;