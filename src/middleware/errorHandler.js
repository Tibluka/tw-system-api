const logger = require('../utils/logger');
const config = require('../config/env');
const { getErrorCode } = require('../constants/errorCodes');

// Classe personalizada para erros da API
class AppError extends Error {
  constructor(message, statusCode, isOperational = true, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code || getErrorCode(message);

    Error.captureStackTrace(this, this.constructor);
  }
}

// Tratar erros do Mongoose
const handleCastErrorDB = (err) => {
  const message = `ID inválido: ${err.value}`;
  return new AppError(message, 400, true, getErrorCode('Invalid ObjectId'));
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'campo duplicado';
  const message = `${value} já existe. Use outro valor.`;
  return new AppError(message, 400, true, getErrorCode('Duplicate entry'));
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Dados inválidos: ${errors.join('. ')}`;
  return new AppError(message, 400, true, getErrorCode('Validation error'));
};

// Tratar erros JWT
const handleJWTError = () =>
  new AppError('Token inválido. Faça login novamente.', 401, true, getErrorCode('Invalid token'));

const handleJWTExpiredError = () =>
  new AppError('Token expirado. Faça login novamente.', 401, true, getErrorCode('Token expired'));

// Enviar erro em desenvolvimento
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    code: err.code || getErrorCode(err.message),
    stack: err.stack
  });
};

// Enviar erro em produção
const sendErrorProd = (err, res) => {
  // Erros operacionais: enviar mensagem para o cliente
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || getErrorCode(err.message)
    });
  } else {
    // Erros de programação: não vazar detalhes
    logger.error('ERROR:', err);

    res.status(500).json({
      success: false,
      message: 'Algo deu errado!',
      code: getErrorCode('Internal server error')
    });
  }
};

// Middleware principal de tratamento de erros
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Garantir que todos os erros tenham um código
  if (!err.code) {
    err.code = getErrorCode(err.message);
  }

  // Log do erro
  if (err.statusCode >= 500) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  } else {
    logger.warn(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }

  // Tratar diferentes tipos de erro (tanto em desenvolvimento quanto em produção)
  let error = { ...err };
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (config.isDevelopment()) {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = {
  AppError,
  errorHandler
};