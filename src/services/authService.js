const crypto = require('crypto');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * Gerar token para reset de senha
 */
const generatePasswordResetToken = async (user) => {
  try {
    // Gerar token aleatório
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash do token para armazenar no banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Salvar token hasheado no usuário (válido por 10 minutos)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
    await user.save();

    // Retornar token original (não hasheado) para envio por email
    return resetToken;
  } catch (error) {
    logger.error('Erro ao gerar token de reset:', error);
    throw new AppError('Erro interno do servidor', 500);
  }
};

/**
 * Resetar senha usando token
 */
const resetPasswordWithToken = async (token, newPassword) => {
  try {
    // Hash do token recebido para comparar com o banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuário com token válido e não expirado
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      throw new AppError('Token inválido ou expirado', 400);
    }

    // Verificar se nova senha é diferente da atual
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new AppError('A nova senha deve ser diferente da atual', 400);
    }

    // Resetar senha e limpar tokens
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;

    await user.save();

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Erro ao resetar senha:', error);
    throw new AppError('Erro interno do servidor', 500);
  }
};

/**
 * Gerar token para verificação de email
 */
const generateEmailVerificationToken = async (user) => {
  try {
    // Gerar token aleatório
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash do token para armazenar no banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Salvar token hasheado no usuário
    user.emailVerificationToken = hashedToken;
    await user.save();

    // Retornar token original para envio por email
    return verificationToken;
  } catch (error) {
    logger.error('Erro ao gerar token de verificação:', error);
    throw new AppError('Erro interno do servidor', 500);
  }
};

/**
 * Verificar email usando token
 */
const verifyEmailWithToken = async (token) => {
  try {
    // Hash do token recebido
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuário com token válido
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      isEmailVerified: false
    });

    if (!user) {
      throw new AppError('Token inválido ou email já verificado', 400);
    }

    // Marcar email como verificado e limpar token
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Erro ao verificar email:', error);
    throw new AppError('Erro interno do servidor', 500);
  }
};

/**
 * Enviar email de verificação
 */
const sendVerificationEmail = async (user) => {
  try {
    // Gerar token de verificação
    const verificationToken = await generateEmailVerificationToken(user);
    
    // Enviar email (se serviço de email estiver configurado)
    if (emailService.isConfigured()) {
      await emailService.sendEmailVerification(user.email, user.name, verificationToken);
    } else {
      // Em desenvolvimento, apenas log o token
      logger.info(`Token de verificação para ${user.email}: ${verificationToken}`);
    }

    return verificationToken;
  } catch (error) {
    logger.error('Erro ao enviar email de verificação:', error);
    throw new AppError('Erro ao enviar email de verificação', 500);
  }
};

/**
 * Enviar email de reset de senha
 */
const sendPasswordResetEmail = async (user) => {
  try {
    // Gerar token de reset
    const resetToken = await generatePasswordResetToken(user);
    
    // Enviar email (se serviço de email estiver configurado)
    if (emailService.isConfigured()) {
      await emailService.sendPasswordReset(user.email, user.name, resetToken);
    } else {
      // Em desenvolvimento, apenas log o token
      logger.info(`Token de reset para ${user.email}: ${resetToken}`);
    }

    return resetToken;
  } catch (error) {
    logger.error('Erro ao enviar email de reset:', error);
    throw new AppError('Erro ao enviar email de reset', 500);
  }
};

/**
 * Validar força da senha
 */
const validatePasswordStrength = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Senha deve ter pelo menos ${minLength} caracteres`);
  }

  if (!hasUpperCase) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!hasLowerCase) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!hasNumbers) {
    errors.push('Senha deve conter pelo menos um número');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
  };
};

/**
 * Limpar tokens expirados
 */
const cleanupExpiredTokens = async () => {
  try {
    const result = await User.updateMany(
      {
        $or: [
          { passwordResetExpires: { $lt: Date.now() } },
          { lockUntil: { $lt: Date.now() } }
        ]
      },
      {
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
          lockUntil: 1,
          loginAttempts: 1
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Limpeza de tokens: ${result.modifiedCount} documentos atualizados`);
    }

    return result;
  } catch (error) {
    logger.error('Erro na limpeza de tokens:', error);
  }
};

/**
 * Obter estatísticas de autenticação
 */
const getAuthStats = async () => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          verifiedEmails: {
            $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
          },
          lockedAccounts: {
            $sum: { $cond: [{ $gt: ['$lockUntil', new Date()] }, 1, 0] }
          },
          recentLogins: {
            $sum: {
              $cond: [
                { $gt: ['$lastLogin', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalUsers: 0,
      activeUsers: 0,
      verifiedEmails: 0,
      lockedAccounts: 0,
      recentLogins: 0
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas de auth:', error);
    throw new AppError('Erro interno do servidor', 500);
  }
};

module.exports = {
  generatePasswordResetToken,
  resetPasswordWithToken,
  generateEmailVerificationToken,
  verifyEmailWithToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  validatePasswordStrength,
  cleanupExpiredTokens,
  getAuthStats
};