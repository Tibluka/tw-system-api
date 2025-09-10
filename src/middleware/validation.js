// Validações básicas (sem Joi por enquanto)
const { body } = require('express-validator');

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

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e senha são obrigatórios'
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
  
  next();
};

const validateCreateUser = (req, res, next) => {
  const { name, email, role } = req.body;
  
  if (!name || !email || !role) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e função são obrigatórios'
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
  
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { name, email, role } = req.body;
  
  // Validar nome se fornecido
  if (name !== undefined) {
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
  }
  
  // Validar email se fornecido
  if (email !== undefined) {
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }
  }
  
  // Validar role se fornecido
  if (role !== undefined) {
    const validRoles = ['user', 'ADMIN', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role deve ser: user, admin ou moderator'
      });
    }
  }
  
  next();
};

const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Senha atual e nova senha são obrigatórias'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ter pelo menos 6 caracteres'
    });
  }
  
  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ser diferente da atual'
    });
  }
  
  next();
};

const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  // Validação básica de ObjectId do MongoDB (24 caracteres hexadecimais)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }
  
  next();
};

const validatePasswordChange = (req, res, next) => {
  const { newPassword } = req.body;
  
  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha é obrigatória'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ter pelo menos 6 caracteres'
    });
  }
  
  next();
};

// Função auxiliar para validar email
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Middleware para validar query parameters de paginação
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Página deve ser um número maior que 0'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limite deve ser um número entre 1 e 100'
    });
  }
  
  next();
};

const generateStrongPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%&*()=';
  let password = '';
  // Garantir pelo menos um de cada
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  // Preencher o restante aleatoriamente
  const all = upper + lower + numbers + specials;
  for (let i = 4; i < 6; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  // Embaralhar para não ficar previsível
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

const validateCNPJ = (cnpj) => {
  // Verificar se CNPJ foi fornecido
  if (!cnpj) return false;
  
  // Verificar se contém apenas números (não aceita . / -)
  if (!/^\d+$/.test(cnpj)) return false;
  
  // Verificar se tem exatamente 14 dígitos
  if (cnpj.length !== 14) return false;
  else return true;
};

// Validações para clientes
const validateCreateClient = [
  body('companyName')
    .notEmpty()
    .withMessage('Razão social é obrigatória')
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .notEmpty()
    .withMessage('CNPJ é obrigatório')
    .custom((value) => {
      if (!validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.phone')
    .notEmpty()
    .withMessage('Telefone é obrigatório')
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de phone inválido'),

  body('contact.email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('address.street')
    .notEmpty()
    .withMessage('Logradouro é obrigatório')
    .trim(),

  body('address.number')
    .notEmpty()
    .withMessage('Número é obrigatório')
    .trim(),

  body('address.complement')
    .optional()
    .trim(),

  body('address.neighborhood')
    .notEmpty()
    .withMessage('Bairro é obrigatório')
    .trim(),

  body('address.city')
    .notEmpty()
    .withMessage('Cidade é obrigatória')
    .trim(),

  body('address.state')
    .notEmpty()
    .withMessage('Estado é obrigatório')
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('address.zipcode')
    .notEmpty()
    .withMessage('CEP é obrigatório')
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('values.valuePerMeter')
    .notEmpty()
    .withMessage('Valor por metro é obrigatório')
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('values.valuePerPiece')
    .notEmpty()
    .withMessage('Valor por peça é obrigatório')
    .isFloat({ min: 0 })
    .withMessage('Valor por peça deve ser um número positivo'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Campo active deve ser verdadeiro ou falso')
];

const validateUpdateClient = [
  body('companyName')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .optional()
    .custom((value) => {
      if (value && !validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.phone')
    .optional()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de phone inválido'),

  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('address.street')
    .optional()
    .notEmpty()
    .withMessage('Logradouro não pode ser vazio')
    .trim(),

  body('address.number')
    .optional()
    .notEmpty()
    .withMessage('Número não pode ser vazio')
    .trim(),

  body('address.complement')
    .optional()
    .trim(),

  body('address.neighborhood')
    .optional()
    .notEmpty()
    .withMessage('Bairro não pode ser vazio')
    .trim(),

  body('address.city')
    .optional()
    .notEmpty()
    .withMessage('Cidade não pode ser vazia')
    .trim(),

  body('address.state')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('address.zipcode')
    .optional()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('values.valuePerMeter')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('values.valuePerPiece')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor por peça deve ser um número positivo'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Campo active deve ser verdadeiro ou falso')
];

const validateCreateDevelopment = [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Client ID must be a valid MongoDB ObjectId'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),

  body('clientReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Client reference must have maximum 100 characters')
    .trim(),

  body('pieceImage')
    .optional()
    .isURL()
    .withMessage('Piece image must be a valid URL'),

  body('variants.color')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Color must have maximum 50 characters')
    .trim(),

  // Production Type Validations
  body('productionType.rotary.enabled')
    .optional()
    .isBoolean()
    .withMessage('Rotary enabled must be a boolean'),

  body('productionType.rotary.negotiatedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negotiated price must be a positive number'),

  body('productionType.localized.enabled')
    .optional()
    .isBoolean()
    .withMessage('Localized enabled must be a boolean'),

  body('productionType.localized.sizes.xs')
    .optional()
    .isInt({ min: 0 })
    .withMessage('XS size must be a positive integer'),

  body('productionType.localized.sizes.s')
    .optional()
    .isInt({ min: 0 })
    .withMessage('S size must be a positive integer'),

  body('productionType.localized.sizes.m')
    .optional()
    .isInt({ min: 0 })
    .withMessage('M size must be a positive integer'),

  body('productionType.localized.sizes.l')
    .optional()
    .isInt({ min: 0 })
    .withMessage('L size must be a positive integer'),

  body('productionType.localized.sizes.xl')
    .optional()
    .isInt({ min: 0 })
    .withMessage('XL size must be a positive integer'),

  body('status')
    .optional()
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active field must be a boolean')
];

// Validations for updating development
const validateUpdateDevelopment = [
  body('clientId')
    .optional()
    .isMongoId()
    .withMessage('Client ID must be a valid MongoDB ObjectId'),

  body('description')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),

  body('clientReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Client reference must have maximum 100 characters')
    .trim(),

  body('pieceImage')
    .optional()
    .isURL()
    .withMessage('Piece image must be a valid URL'),

  body('variants.color')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Color must have maximum 50 characters')
    .trim(),

  // Production Type Validations
  body('productionType.rotary.enabled')
    .optional()
    .isBoolean()
    .withMessage('Rotary enabled must be a boolean'),

  body('productionType.rotary.negotiatedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negotiated price must be a positive number'),

  body('productionType.localized.enabled')
    .optional()
    .isBoolean()
    .withMessage('Localized enabled must be a boolean'),

  body('productionType.localized.sizes.xs')
    .optional()
    .isInt({ min: 0 })
    .withMessage('XS size must be a positive integer'),

  body('productionType.localized.sizes.s')
    .optional()
    .isInt({ min: 0 })
    .withMessage('S size must be a positive integer'),

  body('productionType.localized.sizes.m')
    .optional()
    .isInt({ min: 0 })
    .withMessage('M size must be a positive integer'),

  body('productionType.localized.sizes.l')
    .optional()
    .isInt({ min: 0 })
    .withMessage('L size must be a positive integer'),

  body('productionType.localized.sizes.xl')
    .optional()
    .isInt({ min: 0 })
    .withMessage('XL size must be a positive integer'),

  body('status')
    .optional()
    .isIn('CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED')
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active field must be a boolean')
];

// Custom validation middleware for production type
const validateProductionType = (req, res, next) => {
  const { productionType } = req.body;
  
  if (!productionType) {
    return res.status(400).json({
      success: false,
      message: 'Production type is required'
    });
  }
  
  const { rotary, localized } = productionType;
  
  // At least one production type must be enabled
  if (!rotary?.enabled && !localized?.enabled) {
    return res.status(400).json({
      success: false,
      message: 'At least one production type must be enabled'
    });
  }
  
  // If rotary is enabled, negotiatedPrice is required
  if (rotary?.enabled && !rotary.negotiatedPrice) {
    return res.status(400).json({
      success: false,
      message: 'Negotiated price is required when rotary production is enabled'
    });
  }
  
  // If localized is enabled, at least one size must be greater than 0
  if (localized?.enabled) {
    const sizes = localized.sizes;
    const hasValidSizes = sizes && Object.values(sizes).some(size => size > 0);
    
    if (!hasValidSizes) {
      return res.status(400).json({
        success: false,
        message: 'At least one size quantity must be greater than 0 when localized production is enabled'
      });
    }
  }
  
  next();
};

// Validation for status update
const validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED')
  ];

module.exports = {
  validateLogin,
  validateRegister,
  validateUpdateUser,
  validateChangePassword,
  validateObjectId,
  validatePasswordChange,
  validatePagination,
  generateStrongPassword,
  validateCreateUser,
  validateCNPJ,
  validateUpdateClient,
  validateCreateClient,
  validateStatusUpdate,
  validateProductionType,
  validateUpdateDevelopment,
  validateCreateDevelopment
};
