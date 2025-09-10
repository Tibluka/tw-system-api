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
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // CNPJs com todos os dígitos iguais são inválidos
  
  // Validação dos dígitos verificadores
  let soma = 0;
  let peso = 2;
  
  // Primeiro dígito verificador
  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (parseInt(cnpj.charAt(12)) !== digito1) return false;
  
  // Segundo dígito verificador
  soma = 0;
  peso = 2;
  
  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  
  let digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return parseInt(cnpj.charAt(13)) === digito2;
};

// Validações para clientes
const validateCreateClient = [
  body('razaoSocial')
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

  body('contato.telefone')
    .notEmpty()
    .withMessage('Telefone é obrigatório')
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de telefone inválido'),

  body('contato.email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('endereco.logradouro')
    .notEmpty()
    .withMessage('Logradouro é obrigatório')
    .trim(),

  body('endereco.numero')
    .notEmpty()
    .withMessage('Número é obrigatório')
    .trim(),

  body('endereco.complemento')
    .optional()
    .trim(),

  body('endereco.bairro')
    .notEmpty()
    .withMessage('Bairro é obrigatório')
    .trim(),

  body('endereco.cidade')
    .notEmpty()
    .withMessage('Cidade é obrigatória')
    .trim(),

  body('endereco.estado')
    .notEmpty()
    .withMessage('Estado é obrigatório')
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('endereco.cep')
    .notEmpty()
    .withMessage('CEP é obrigatório')
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('valores.valorPorMetro')
    .notEmpty()
    .withMessage('Valor por metro é obrigatório')
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('valores.valorPorPeca')
    .notEmpty()
    .withMessage('Valor por peça é obrigatório')
    .isFloat({ min: 0 })
    .withMessage('Valor por peça deve ser um número positivo'),

  body('ativo')
    .optional()
    .isBoolean()
    .withMessage('Campo ativo deve ser verdadeiro ou falso')
];

const validateUpdateClient = [
  body('razaoSocial')
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

  body('contato.telefone')
    .optional()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de telefone inválido'),

  body('contato.email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('endereco.logradouro')
    .optional()
    .notEmpty()
    .withMessage('Logradouro não pode ser vazio')
    .trim(),

  body('endereco.numero')
    .optional()
    .notEmpty()
    .withMessage('Número não pode ser vazio')
    .trim(),

  body('endereco.complemento')
    .optional()
    .trim(),

  body('endereco.bairro')
    .optional()
    .notEmpty()
    .withMessage('Bairro não pode ser vazio')
    .trim(),

  body('endereco.cidade')
    .optional()
    .notEmpty()
    .withMessage('Cidade não pode ser vazia')
    .trim(),

  body('endereco.estado')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('endereco.cep')
    .optional()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('valores.valorPorMetro')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('valores.valorPorPeca')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor por peça deve ser um número positivo'),

  body('ativo')
    .optional()
    .isBoolean()
    .withMessage('Campo ativo deve ser verdadeiro ou falso')
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
  validateCreateClient
};
