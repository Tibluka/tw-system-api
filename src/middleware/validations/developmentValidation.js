const { body } = require('express-validator');

// Validações para criação de development
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

  // VALIDAÇÃO SIMPLIFICADA - Production Type como string
  body('productionType')
    .notEmpty()
    .withMessage('Production type is required')
    .isIn(['rotary', 'localized'])
    .withMessage('Production type must be rotary or localized'),

  body('status')
    .optional()
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validações para atualização de development
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

  // VALIDAÇÃO SIMPLIFICADA - Production Type como string (opcional para update)
  body('productionType')
    .optional()
    .isIn(['rotary', 'localized'])
    .withMessage('Production type must be rotary or localized'),

  body('status')
    .optional()
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação customizada simplificada - não necessária mais
const validateAndTransformProductionType = (req, res, next) => {
  // Validação simples já feita pelo express-validator
  next();
};

// Validação para atualização de status
const validateStatusUpdate = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED')
];

module.exports = {
  validateCreateDevelopment,
  validateUpdateDevelopment,
  validateAndTransformProductionType,
  validateStatusUpdate
};
