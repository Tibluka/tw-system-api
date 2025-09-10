const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const { AppError } = require('./errorHandler');

// Middleware para verificar token JWT
const authenticate = async (req, res, next) => {
  try {
    // 1) Verificar se o token existe
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Você não está logado. Faça login para acessar.', 401));
    }

    // 2) Verificar se o token é válido
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // 3) Verificar se o usuário ainda existe
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('O usuário deste token não existe mais.', 401));
    }

    // 4) Verificar se o usuário está ativo
    if (!currentUser.isActive) {
      return next(new AppError('Sua conta foi desativada. Entre em contato com o suporte.', 401));
    }

    // 5) Verificar se a conta não está bloqueada
    if (currentUser.isLocked) {
      return next(new AppError('Conta temporariamente bloqueada devido a muitas tentativas de login.', 423));
    }

    // 6) Atualizar último login
    await User.findByIdAndUpdate(decoded.id, {
      lastLogin: new Date()
    });

    // 7) Adicionar usuário à requisição
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido. Faça login novamente.', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado. Faça login novamente.', 401));
    }
    return next(error);
  }
};

// Middleware para verificar permissões por role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuário não autenticado.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Você não tem permissão para acessar este recurso.', 403));
    }

    next();
  };
};

// Middleware para verificar se o usuário pode acessar seus próprios dados
const authorizeOwnership = async (req, res, next) => {
  try {
    const userId = req.params.id || req.params.userId;
    
    // Admins podem acessar qualquer recurso
    if (req.user.role === 'admin') {
      return next();
    }

    // Usuários só podem acessar seus próprios dados
    if (req.user.id !== userId) {
      return next(new AppError('Você só pode acessar seus próprios dados.', 403));
    }

    next();
  } catch (error) {
    return next(error);
  }
};

// Middleware opcional de autenticação (não retorna erro se não autenticado)
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    
    if (currentUser && currentUser.isActive && !currentUser.isLocked) {
      req.user = currentUser;
    }

    next();
  } catch (error) {
    // Em caso de erro, continua sem usuário autenticado
    next();
  }
};

// Middleware para verificar refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new AppError('Refresh token é obrigatório.', 400));
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return next(new AppError('Token inválido.', 401));
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(new AppError('Usuário inválido ou inativo.', 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Refresh token inválido ou expirado.', 401));
    }
    return next(error);
  }
};

module.exports = {
  authenticate,
  authorize,
  authorizeOwnership,
  optionalAuth,
  verifyRefreshToken
};