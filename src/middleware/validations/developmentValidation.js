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

  // NOVA VALIDAÇÃO - Production Type como objeto
  body('productionType')
    .notEmpty()
    .withMessage('Production type is required')
    .isObject()
    .withMessage('Production type must be an object'),

  // ADICIONAR estas novas validações:
  body('productionType.meters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Meters must be a positive number'),

  body('productionType.additionalInfo.variant')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Variant must have maximum 100 characters'),

  body('productionType.additionalInfo.sizes')
    .optional()
    .isArray()
    .withMessage('Sizes must be an array'),

  body('productionType.additionalInfo.sizes.*.size')
    .optional()
    .isIn(['PP', 'P', 'M', 'G', 'G1', 'G2'])
    .withMessage('Size must be one of: PP, P, M, G, G1, G2'),

  body('productionType.additionalInfo.sizes.*.value')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Size value must be a positive integer'),

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

  // NOVA VALIDAÇÃO - Production Type como objeto (opcional para update)
  body('productionType')
    .optional()
    .isObject()
    .withMessage('Production type must be an object'),

  body('productionType.type')
    .optional()
    .isIn(['rotary', 'localized'])
    .withMessage('Production type.type must be: rotary or localized'),

  body('productionType.meters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Production type meters must be a positive number'),

  body('productionType.sizes')
    .optional()
    .isArray()
    .withMessage('Production type sizes must be an array'),

  body('status')
    .optional()
    .isIn(['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'])
    .withMessage('Status must be: CREATED, AWAITING_APPROVAL, APPROVED, CANCELED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação para transformar e validar production type
const validateAndTransformProductionType = (req, res, next) => {
  try {
    const { productionType } = req.body;

    if (!productionType) {
      return next();
    }

    // Se for localized, garantir que tem additionalInfo e sizes
    if (productionType.type === 'localized') {
      if (!productionType.additionalInfo) {
        productionType.additionalInfo = {
          variant: '',
          sizes: [
            { size: 'PP', value: 0 },
            { size: 'P', value: 0 },
            { size: 'M', value: 0 },
            { size: 'G', value: 0 },
            { size: 'G1', value: 0 },
            { size: 'G2', value: 0 }
          ]
        };
      }
    } else if (productionType.type === 'rotary') {
      // Para rotary, garantir que tem meters
      if (!productionType.meters) {
        productionType.meters = 0;
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error processing production type',
      error: error.message
    });
  }
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
