const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate, verifyRefreshToken } = require('../middleware/auth');
const { validateLogin, validateRegister, validateChangePassword } = require('../middleware/validation');

const router = express.Router();

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 requests por IP
  message: {
    success: false,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.'
  }
});

// Aplicar rate limiting geral para todas as rotas de auth
router.use(generalAuthLimiter);

// @route   POST /api/v1/auth/register
// @desc    Registrar novo usuário
// @access  Public
router.post('/register', validateRegister, authController.register);

// @route   POST /api/v1/auth/login
// @desc    Login do usuário
// @access  Public
router.post('/login', authLimiter, validateLogin, authController.login);

// @route   POST /api/v1/auth/refresh
// @desc    Renovar access token usando refresh token
// @access  Public
router.post('/refresh', verifyRefreshToken, authController.refreshToken);

// @route   POST /api/v1/auth/logout
// @desc    Logout do usuário
// @access  Private
router.post('/logout', authenticate, authController.logout);

// @route   GET /api/v1/auth/me
// @desc    Obter dados do usuário logado
// @access  Private
router.get('/me', authenticate, authController.getMe);

// @route   PUT /api/v1/auth/change-password
// @desc    Alterar senha do usuário logado
// @access  Private
router.put('/change-password', authenticate, validateChangePassword, authController.changePassword);

// @route   POST /api/v1/auth/forgot-password
// @desc    Solicitar reset de senha
// @access  Public
router.post('/forgot-password', authController.forgotPassword);

// @route   POST /api/v1/auth/reset-password/:token
// @desc    Resetar senha usando token
// @access  Public
router.post('/reset-password/:token', authController.resetPassword);

// @route   POST /api/v1/auth/verify-email/:token
// @desc    Verificar email usando token
// @access  Public
router.post('/verify-email/:token', authController.verifyEmail);

// @route   POST /api/v1/auth/resend-verification
// @desc    Reenviar email de verificação
// @access  Private
router.post('/resend-verification', authenticate, authController.resendVerification);

module.exports = router;