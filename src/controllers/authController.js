const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const authService = require('../services/authService');
const logger = require('../utils/logger');

// @desc    Registrar novo usuário
// @route   POST /api/v1/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se o usuário já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('Email já está em uso', 400));
    }

    // Criar novo usuário
    const user = await User.create({
      name,
      email,
      password
    });

    // Gerar tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Log da atividade
    logger.info(`Novo usuário registrado: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login do usuário
// @route   POST /api/v1/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário com senha
    const user = await User.findByEmailWithPassword(email);

    // Verificar se usuário existe
    if (!user) {
      return next(new AppError('Credenciais inválidas', 401));
    }

    // Verificar se conta está bloqueada
    if (user.isLocked) {
      return next(new AppError('Conta temporariamente bloqueada devido a muitas tentativas de login', 423));
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return next(new AppError('Conta desativada. Entre em contato com o suporte', 401));
    }

    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Incrementar tentativas de login
      await user.incLoginAttempts();
      
      logger.warn(`Tentativa de login inválida para: ${email} - IP: ${req.ip}`);
      return next(new AppError('Credenciais inválidas', 401));
    }

    // Reset tentativas de login em caso de sucesso
    if (user.loginAttempts && user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Gerar tokens
    const accessToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Log da atividade
    logger.info(`Login bem-sucedido: ${email} - IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Renovar access token
// @route   POST /api/v1/auth/refresh
// @access  Public (com refresh token)
const refreshToken = async (req, res, next) => {
  try {
    const user = req.user; // Vem do middleware verifyRefreshToken

    // Gerar novos tokens
    const accessToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    logger.info(`Token renovado para usuário: ${user.email}`);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout do usuário
// @route   POST /api/v1/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    // Em uma implementação completa, você adicionaria o token a uma blacklist
    // Por simplicidade, apenas logamos a ação
    
    logger.info(`Logout realizado: ${req.user.email} - IP: ${req.ip}`);

    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obter dados do usuário logado
// @route   GET /api/v1/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Alterar senha do usuário logado
// @route   PUT /api/v1/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Buscar usuário com senha
    const user = await User.findById(req.user.id).select('+password');

    // Verificar senha atual
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return next(new AppError('Senha atual incorreta', 400));
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return next(new AppError('A nova senha deve ser diferente da atual', 400));
    }

    // Atualizar senha
    user.password = newPassword;
    await user.save();

    logger.info(`Senha alterada para usuário: ${user.email}`);

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Solicitar reset de senha
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Por segurança, não informar se o email existe ou não
      return res.json({
        success: true,
        message: 'Se o email existir, um link de recuperação será enviado'
      });
    }

    // Gerar token de reset (implementar conforme necessário)
    const resetToken = await authService.generatePasswordResetToken(user);

    // Enviar email (implementar serviço de email)
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    logger.info(`Solicitação de reset de senha para: ${email}`);

    res.json({
      success: true,
      message: 'Se o email existir, um link de recuperação será enviado'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resetar senha usando token
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Verificar e usar token para resetar senha
    const user = await authService.resetPasswordWithToken(token, password);

    logger.info(`Senha resetada para usuário: ${user.email}`);

    res.json({
      success: true,
      message: 'Senha resetada com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verificar email usando token
// @route   POST /api/v1/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Implementar verificação de email
    const user = await authService.verifyEmailWithToken(token);

    logger.info(`Email verificado para usuário: ${user.email}`);

    res.json({
      success: true,
      message: 'Email verificado com sucesso'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reenviar email de verificação
// @route   POST /api/v1/auth/resend-verification
// @access  Private
const resendVerification = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.isEmailVerified) {
      return next(new AppError('Email já está verificado', 400));
    }

    // Gerar novo token e enviar email
    await authService.sendVerificationEmail(user);

    logger.info(`Email de verificação reenviado para: ${user.email}`);

    res.json({
      success: true,
      message: 'Email de verificação enviado'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification
};