const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const transports = [];

transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  })
);

// File transports apenas em produção
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: customFormat,
      level: 'info',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: customFormat,
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: customFormat,
  transports,
  exitOnError: false
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;