const { body } = require('express-validator');

// Validações para login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
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
      message: 'Nome, email, senha e função são obrigatórios'
    });
  }

  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter entre 2 e 50 caracteres'
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Senha deve ter pelo menos 6 caracteres'
    });
  }

  if (!['ADMIN', 'USER'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Função deve ser ADMIN ou USER'
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
    .isIn(['ADMIN', 'USER'])
    .withMessage('Função deve ser ADMIN ou USER'),

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

module.exports = {
  validateLogin,
  validateRegister,
  validateCreateUser: validateRegister, // Alias para compatibilidade
  validateUpdateUser,
  validateChangePassword,
  validateResetPassword,
  validateConfirmResetPassword
};
