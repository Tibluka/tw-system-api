const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');

const PORT = config.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`🌍 Ambiente: ${config.NODE_ENV}`);
  logger.info(`📝 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/v1`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Fechando servidor...');
  server.close(() => {
    logger.info('Servidor fechado.');
    process.exit(0);
  });
});

// Capturar erros não tratados
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

module.exports = server;