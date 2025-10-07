const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('express-async-errors');

const config = require('./config/env');
const corsConfig = require('./config/cors');
const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Conectar ao banco de dados
connectDB();

// Middlewares de segurança
app.use(helmet());
app.use(compression());

// CORS
app.use(cors(corsConfig));

// Rate limiting - mais permissivo para desenvolvimento
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP por janela (aumentado de 100)
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Desabilitar rate limiting em desenvolvimento
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});
app.use('/api', limiter);

// Logging
if (config.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api/v1', routes);

// Rota temporária para admin (SEM AUTENTICAÇÃO)
const adminRoutes = require('./routes/admin');
app.use('/api/v1/admin', adminRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'TW-System API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health'
  });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler); // CORREÇÃO: Agora está correto

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

module.exports = app;