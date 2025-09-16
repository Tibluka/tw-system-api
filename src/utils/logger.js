const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Detectar se está rodando em debug mode do VS Code
const isDebugMode = process.env.NODE_ENV === 'development' || !!process.env.VSCODE_DEBUG;

// Criar diretório de logs se não existir
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Formato customizado para console (mais limpo)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    // Se estiver em debug mode, também usar console.log nativo
    if (isDebugMode) {
      const logMessage = `${timestamp} [${level}]: ${stack || message}`;
      // Garantir que apareça no debug console
      if (level.includes('error')) {
        } else if (level.includes('warn')) {
        } else {
        }
    }
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// Formato para arquivos
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configurar transports
const transports = [];

// Console transport (sempre active)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug',
    silent: false // Garantir que não está silenciado
  })
);

// File transports
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      format: fileFormat,
      level: 'info',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

// Criar o logger
const logger = winston.createLogger({
  level: 'debug',
  format: fileFormat,
  transports,
  exitOnError: false
});

// Função auxiliar para garantir logs em debug mode
const createLogMethod = (level) => {
  return (message, ...args) => {
    // Log via Winston
    logger[level](message, ...args);
    
    // Em debug mode, também fazer log direto no console
    if (isDebugMode) {
      const timestamp = new Date().toLocaleTimeString();
      const formattedMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      switch (level) {
        case 'error':
          break;
        case 'warn':
          break;
        default:
          }
    }
  };
};

// Sobrescrever métodos para garantir que apareçam no debug
const debugLogger = {
  info: createLogMethod('info'),
  error: createLogMethod('error'),
  warn: createLogMethod('warn'),
  debug: createLogMethod('debug'),
  
  // Stream para Morgan
  stream: {
    write: (message) => {
      const cleanMessage = message.trim();
      logger.info(cleanMessage);
      
      // También log direto em debug mode
      if (isDebugMode) {
        }
    }
  }
};

module.exports = debugLogger;