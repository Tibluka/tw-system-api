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
const isValidEmail = email => {
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
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
};

const validateCNPJ = cnpj => {
  // Verificar se CNPJ foi fornecido
  if (!cnpj) return false;

  // Verificar se contém apenas números (não aceita . / -)
  //if (!/^\d+$/.test(cnpj)) return false;

  // Verificar se tem exatamente 14 dígitos
  //if (cnpj.length !== 14) return false;
  else return true;
};

// Validações para clientes
const validateCreateClient = [
  body('acronym')
    .notEmpty()
    .withMessage('Acronym is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Acronym must be between 2 and 10 characters')
    .trim()
    .custom(async (value, { req }) => {
      const Client = require('../models/Client');

      // Converter para uppercase para comparação
      const upperAcronym = value.toUpperCase();

      // Verificar se já existe no banco (exceto o próprio cliente sendo atualizado)
      const existingClient = await Client.findOne({
        acronym: upperAcronym,
        active: true,
        _id: { $ne: req.params.id } // Excluir o próprio cliente
      });

      if (existingClient) {
        throw new Error('Acronym already exists. Choose a different one.');
      }

      return true;
    }),
  body('companyName')
    .notEmpty()
    .withMessage('Razão social é obrigatória')
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .notEmpty()
    .withMessage('CNPJ é obrigatório')
    .custom(value => {
      if (!validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.responsibleName')
    .notEmpty()
    .withMessage('Responsible name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible name must be between 2 and 100 characters')
    .trim(),

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

  body('address.street').notEmpty().withMessage('Logradouro é obrigatório').trim(),

  body('address.number').notEmpty().withMessage('Número é obrigatório').trim(),

  body('address.complement').optional().trim(),

  body('address.neighborhood').notEmpty().withMessage('Bairro é obrigatório').trim(),

  body('address.city').notEmpty().withMessage('Cidade é obrigatória').trim(),

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

  body('active').optional().isBoolean().withMessage('Campo active deve ser verdadeiro ou falso')
];

const validateUpdateClient = [
  body('acronym')
    .notEmpty()
    .withMessage('Acronym is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Acronym must be between 2 and 10 characters')
    .trim()
    .custom(async (value, { req }) => {
      const Client = require('../models/Client');

      // Converter para uppercase para comparação
      const upperAcronym = value.toUpperCase();

      // Verificar se já existe no banco (exceto o próprio cliente sendo atualizado)
      const existingClient = await Client.findOne({
        acronym: upperAcronym,
        active: true,
        _id: { $ne: req.params.id } // Excluir o próprio cliente
      });

      if (existingClient) {
        throw new Error('Acronym already exists. Choose a different one.');
      }

      return true;
    }),
  body('companyName')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .optional()
    .custom(value => {
      if (value && !validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.responsibleName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible name must be between 2 and 100 characters')
    .trim(),

  body('contact.phone')
    .optional()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de phone inválido'),

  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('address.street').optional().notEmpty().withMessage('Logradouro não pode ser vazio').trim(),

  body('address.number').optional().notEmpty().withMessage('Número não pode ser vazio').trim(),

  body('address.complement').optional().trim(),

  body('address.neighborhood')
    .optional()
    .notEmpty()
    .withMessage('Bairro não pode ser vazio')
    .trim(),

  body('address.city').optional().notEmpty().withMessage('Cidade não pode ser vazia').trim(),

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

  body('active').optional().isBoolean().withMessage('Campo active deve ser verdadeiro ou falso')
];

const validateCreateDevelopment = [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Client ID must be a valid MongoDB ObjectId'),

  body('description')
    .optional()
    .trim(),

  body('clientReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Client reference must have maximum 100 characters')
    .trim(),

  body('pieceImage').optional().isURL().withMessage('Piece image must be a valid URL'),

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

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validations for updating development
const validateUpdateDevelopment = [
  body('clientId').optional().isMongoId().withMessage('Client ID must be a valid MongoDB ObjectId'),

  body('description')
    .optional()
    .trim(),

  body('clientReference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Client reference must have maximum 100 characters')
    .trim(),

  body('pieceImage').optional().isURL().withMessage('Piece image must be a valid URL'),

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

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
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

// Validations for creating production order
const validateCreateProductionOrder = [
  body('developmentId')
    .notEmpty()
    .withMessage('Development ID is required')
    .isMongoId()
    .withMessage('Development ID must be a valid MongoDB ObjectId'),

  body('fabricType')
    .notEmpty()
    .withMessage('Fabric type is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Fabric type must be between 2 and 100 characters')
    .trim(),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observations must have maximum 1000 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['started', 'impediment', 'awaiting_approval', 'approved', 'refused'])
    .withMessage('Status must be: started, impediment, awaiting_approval, approved, or refused'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validations for updating production order
const validateUpdateProductionOrder = [
  body('developmentId')
    .optional()
    .isMongoId()
    .withMessage('Development ID must be a valid MongoDB ObjectId'),

  body('fabricType')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Fabric type must be between 2 and 100 characters')
    .trim(),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observations must have maximum 1000 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['started', 'impediment', 'awaiting_approval', 'approved', 'refused'])
    .withMessage('Status must be: started, impediment, awaiting_approval, approved, or refused'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validation for status update
const validateStatusUpdateProductionOrder = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      'CREATED',
      'PILOT_PRODUCTION',
      'PILOT_SENT',
      'PILOT_APPROVED',
      'PRODUCTION_STARTED',
      'FINALIZED'
    ])
    .withMessage(
      'Status must be: CREATED, PILOT_PRODUCTION, PILOT_SENT, PILOT_APPROVED, PRODUCTION_STARTED, or FINALIZED'
    )
];

// Validations for creating production sheet
const validateCreateProductionSheet = [
  body('productionOrderId')
    .notEmpty()
    .withMessage('Production order ID is required')
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  // internalReference NÃO é obrigatório aqui - será copiado automaticamente da ProductionOrder

  body('entryDate').optional().isISO8601().withMessage('Entry date must be a valid date'),

  body('expectedExitDate')
    .notEmpty()
    .withMessage('Expected exit date is required')
    .isISO8601()
    .withMessage('Expected exit date must be a valid date')
    .custom((value, { req }) => {
      // Verificar se expectedExitDate é posterior a entryDate
      const entryDate = req.body.entryDate ? new Date(req.body.entryDate) : new Date();
      const expectedExitDate = new Date(value);

      if (expectedExitDate <= entryDate) {
        throw new Error('Expected exit date must be after entry date');
      }
      return true;
    }),

  body('machine')
    .notEmpty()
    .withMessage('Machine is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('Machine must be 1, 2, 3, or 4'),

  body('stage')
    .optional()
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED'),

  body('productionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Production notes must have maximum 1000 characters')
    .trim(),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validations for updating production sheet
const validateUpdateProductionSheet = [
  body('productionOrderId')
    .optional()
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  body('entryDate').optional().isISO8601().withMessage('Entry date must be a valid date'),

  body('expectedExitDate')
    .optional()
    .isISO8601()
    .withMessage('Expected exit date must be a valid date')
    .custom((value, { req }) => {
      // Verificar se expectedExitDate é posterior a entryDate (se ambos fornecidos)
      if (req.body.entryDate && value) {
        const entryDate = new Date(req.body.entryDate);
        const expectedExitDate = new Date(value);

        if (expectedExitDate <= entryDate) {
          throw new Error('Expected exit date must be after entry date');
        }
      }
      return true;
    }),

  body('machine').optional().isInt({ min: 1, max: 4 }).withMessage('Machine must be 1, 2, 3, or 4'),

  body('stage')
    .optional()
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED'),

  body('productionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Production notes must have maximum 1000 characters')
    .trim(),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validation for stage update
const validateStageUpdateProductionSheet = [
  body('stage')
    .notEmpty()
    .withMessage('Stage is required')
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED')
];

// Custom validation middleware for machine availability
const validateMachineAvailability = async (req, res, next) => {
  try {
    const { machine, entryDate, expectedExitDate } = req.body;

    if (!machine || !expectedExitDate) {
      return next();
    }

    const ProductionSheet = require('../models/ProductionSheet');

    // Verificar se a máquina já está ocupada no período
    const startDate = entryDate ? new Date(entryDate) : new Date();
    const endDate = new Date(expectedExitDate);

    const conflictingSheets = await ProductionSheet.find({
      machine: machine,
      active: true,
      stage: { $ne: 'FINISHED' }, // Excluir finalizados
      $or: [
        // Sheet existente que começa durante o período solicitado
        {
          entryDate: { $gte: startDate, $lte: endDate }
        },
        // Sheet existente que termina durante o período solicitado
        {
          expectedExitDate: { $gte: startDate, $lte: endDate }
        },
        // Sheet existente que engloba todo o período solicitado
        {
          entryDate: { $lte: startDate },
          expectedExitDate: { $gte: endDate }
        }
      ]
    });

    // Se estiver atualizando, excluir o próprio registro
    if (req.params.id) {
      const filteredConflicts = conflictingSheets.filter(
        sheet => sheet._id.toString() !== req.params.id
      );

      if (filteredConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Machine ${machine} is already busy during this period`,
          conflictingSheets: filteredConflicts.map(sheet => ({
            id: sheet._id,
            internalReference: sheet.internalReference,
            entryDate: sheet.entryDate,
            expectedExitDate: sheet.expectedExitDate
          }))
        });
      }
    } else if (conflictingSheets.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Machine ${machine} is already busy during this period`,
        conflictingSheets: conflictingSheets.map(sheet => ({
          id: sheet._id,
          internalReference: sheet.internalReference,
          entryDate: sheet.entryDate,
          expectedExitDate: sheet.expectedExitDate
        }))
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating machine availability',
      error: error.message
    });
  }
};

// ===== VALIDAÇÕES DO PRODUCTION RECEIPT =====

// Validations for creating production receipt
const validateCreateProductionReceipt = [
  body('productionOrderId')
    .notEmpty()
    .withMessage('Production order ID is required')
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'])
    .withMessage(
      'Payment method must be: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX, or CHECK'
    ),

  body('paymentStatus')
    .optional()
    .isIn(['PENDING', 'PAID'])
    .withMessage('Payment status must be: PENDING or PAID'),

  body('totalAmount')
    .notEmpty()
    .withMessage('Total amount is required')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('paidAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.totalAmount && value > parseFloat(req.body.totalAmount)) {
        throw new Error('Paid amount cannot be greater than total amount');
      }
      return true;
    }),

  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must have maximum 1000 characters')
    .trim(),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validations for updating production receipt
const validateUpdateProductionReceipt = [
  body('productionOrderId')
    .optional()
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'])
    .withMessage(
      'Payment method must be: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX, or CHECK'
    ),

  body('paymentStatus')
    .optional()
    .isIn(['PENDING', 'PAID'])
    .withMessage('Payment status must be: PENDING or PAID'),

  body('totalAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),

  body('paidAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be a positive number'),

  body('dueDate').optional().isISO8601().withMessage('Due date must be a valid date'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must have maximum 1000 characters')
    .trim(),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validation for payment status update
const validatePaymentStatusUpdateProductionReceipt = [
  body('paymentStatus')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['PENDING', 'PAID'])
    .withMessage('Payment status must be: PENDING or PAID'),

  body('paymentDate').optional().isISO8601().withMessage('Payment date must be a valid date')
];

// Validation for process payment
const validateProcessPayment = [
  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),

  body('paymentDate').optional().isISO8601().withMessage('Payment date must be a valid date')
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
  validateCreateDevelopment,
  validateCreateProductionOrder,
  validateUpdateProductionOrder,
  validateStatusUpdateProductionOrder,
  validateCreateProductionSheet,
  validateUpdateProductionSheet,
  validateStageUpdateProductionSheet,
  validateMachineAvailability,
  validateCreateProductionReceipt,
  validateUpdateProductionReceipt,
  validatePaymentStatusUpdateProductionReceipt,
  validateProcessPayment
};
