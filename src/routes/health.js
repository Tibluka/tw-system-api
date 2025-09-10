const express = require('express');
const mongoose = require('mongoose');
const os = require('os');
const config = require('../config/env');

const router = express.Router();

// @route   GET /api/v1/health
// @desc    Health check básico
// @access  Public
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// @route   GET /api/v1/health/detailed
// @desc    Health check detalhado
// @access  Public
router.get('/detailed', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      loadavg: os.loadavg()
    },
    services: {}
  };

  // Verificar conexão com MongoDB
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    healthCheck.services.database = {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      state: dbStates[dbState],
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };

    // Teste de ping no banco
    if (dbState === 1) {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const duration = Date.now() - start;
      healthCheck.services.database.responseTime = `${duration}ms`;
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    healthCheck.status = 'DEGRADED';
  }

  // Verificar uso de memória
  const memUsage = process.memoryUsage();
  healthCheck.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`
  };

  // Determinar status geral
  const isHealthy = Object.values(healthCheck.services).every(
    service => service.status === 'healthy'
  );

  if (!isHealthy && healthCheck.status === 'OK') {
    healthCheck.status = 'UNHEALTHY';
  }

  const statusCode = healthCheck.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// @route   GET /api/v1/health/liveness
// @desc    Liveness probe para Kubernetes
// @access  Public
router.get('/liveness', (req, res) => {
  // Verifica apenas se o processo está rodando
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// @route   GET /api/v1/health/readiness
// @desc    Readiness probe para Kubernetes
// @access  Public
router.get('/readiness', async (req, res) => {
  try {
    // Verificar se todos os serviços críticos estão prontos
    const isDbReady = mongoose.connection.readyState === 1;
    
    if (!isDbReady) {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not ready'
      });
    }

    // Teste rápido no banco
    await mongoose.connection.db.admin().ping();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: error.message
    });
  }
});

module.exports = router;