const { body } = require('express-validator');
const { ERROR_CODES } = require('../../constants/errorCodes');

// Validações para login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios',
      code: ERROR_CODES.MISSING_REQUIRED_FIELD
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido',
      code: ERROR_CODES.INVALID_EMAIL_FORMAT
    });
  }

  next();
};

// Validações para registro
const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email, senha e função são obrigatórios',
      code: ERROR_CODES.MISSING_REQUIRED_FIELD
    });
  }

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter entre 2 e 50 caracteres',
      code: ERROR_CODES.INVALID_STRING_LENGTH
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido',
      code: ERROR_CODES.INVALID_EMAIL_FORMAT
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Senha deve ter pelo menos 6 caracteres',
      code: ERROR_CODES.INVALID_PASSWORD_FORMAT
    });
  }

  if (!['DEFAULT', 'PRINTING', 'ADMIN', 'FINANCING'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Função deve ser DEFAULT, PRINTING, ADMIN ou FINANCING',
      code: ERROR_CODES.INVALID_ENUM_VALUE
    });
  }

  next();
};

// Validações para atualização de usuário
const validateUpdateUser = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),

  body('role')
    .optional()
    .isIn(['DEFAULT', 'PRINTING', 'ADMIN', 'FINANCING'])
    .withMessage('Função deve ser DEFAULT, PRINTING, ADMIN ou FINANCING'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Campo active deve ser verdadeiro ou falso')
];

// Validações para mudança de senha
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),

  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    })
];

// Validações para reset de senha
const validateResetPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail()
];

// Validações para confirmação de reset de senha
const validateConfirmResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Token é obrigatório'),

  body('newPassword')
    .notEmpty()
    .withMessage('Nova senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres'),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirmação de senha é obrigatória')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    })
];

// Função auxiliar para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validação específica para criação de usuário (com verificação de perfil)
const validateCreateUser = [
  body('name')
    .notEmpty()
    .withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 50 })
    .withMessage('Nome deve ter entre 2 e 50 caracteres')
    .trim(),

  body('email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres'),

  body('role')
    .notEmpty()
    .withMessage('Função é obrigatória')
    .isIn(['DEFAULT', 'PRINTING', 'ADMIN', 'FINANCING'])
    .withMessage('Função deve ser DEFAULT, PRINTING, ADMIN ou FINANCING')
];

module.exports = {
  validateLogin,
  validateRegister,
  validateCreateUser,
  validateUpdateUser,
  validateChangePassword,
  validateResetPassword,
  validateConfirmResetPassword
};
