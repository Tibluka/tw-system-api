const crypto = require('crypto');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
// const emailService = require('./emailService'); // Comentado temporariamente
const logger = require('../utils/logger');

/**
 * Gerar token para reset de senha
 */
const generatePasswordResetToken = async (user) => {
  try {
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutos
    await user.save();

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
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      throw new AppError('Token inválido ou expirado', 400);
    }

    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new AppError('A nova senha deve ser diferente da atual', 400);
    }

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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    user.emailVerificationToken = hashedToken;
    await user.save();

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
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      isEmailVerified: false
    });

    if (!user) {
      throw new AppError('Token inválido ou email já verificado', 400);
    }

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
 * Enviar email de verificação (simulado por enquanto)
 */
const sendVerificationEmail = async (user) => {
  try {
    const verificationToken = await generateEmailVerificationToken(user);
    
    // Por enquanto apenas log - depois integrar com emailService
    logger.info(`Token de verificação para ${user.email}: ${verificationToken}`);
    logger.info(`URL de verificação: http://localhost:4200/verify-email/${verificationToken}`);

    return verificationToken;
  } catch (error) {
    logger.error('Erro ao enviar email de verificação:', error);
    throw new AppError('Erro ao enviar email de verificação', 500);
  }
};

/**
 * Enviar email de reset de senha (simulado por enquanto)
 */
const sendPasswordResetEmail = async (user) => {
  try {
    const resetToken = await generatePasswordResetToken(user);
    
    // Por enquanto apenas log - depois integrar com emailService
    logger.info(`Token de reset para ${user.email}: ${resetToken}`);
    logger.info(`URL de reset: http://localhost:4200/reset-password/${resetToken}`);

    return resetToken;
  } catch (error) {
    logger.error('Erro ao enviar email de reset:', error);
    throw new AppError('Erro ao enviar email de reset', 500);
  }
};

module.exports = {
  generatePasswordResetToken,
  resetPasswordWithToken,
  generateEmailVerificationToken,
  verifyEmailWithToken,
  sendVerificationEmail,
  sendPasswordResetEmail
};