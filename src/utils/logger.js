const winston = require('winston');
const path = require('path');
const config = require('../config/env');

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Formato para console (desenvolvimento)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Configuração dos transports
const transports = [];

// Console transport (sempre ativo)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: config.isDevelopment() ? 'debug' : config.LOG_LEVEL
  })
);

// File transports (apenas em produção)
if (config.isProduction()) {
  // Log geral
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'app.log'),
      format: customFormat,
      level: config.LOG_LEVEL,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Log de erros
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      format: customFormat,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Criar o logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: customFormat,
  transports,
  exitOnError: false
});

// Stream para Morgan (HTTP logs)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;