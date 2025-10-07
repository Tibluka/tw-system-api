const { body } = require('express-validator');

// Validações para criação de production order
const validateCreateProductionOrder = [
  body('developmentId')
    .notEmpty()
    .withMessage('Development ID is required')
    .isMongoId()
    .withMessage('Development ID must be a valid MongoDB ObjectId'),

  body('productionType')
    .notEmpty()
    .withMessage('Production type is required')
    .isObject()
    .withMessage('Production type must be an object'),

  body('productionType.type')
    .notEmpty()
    .withMessage('Production type type is required')
    .isIn(['rotary', 'localized'])
    .withMessage('Production type must be rotary or localized'),

  // Para rotary: metros e fabricType obrigatórios
  body('productionType.meters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Meters must be a positive number'),

  body('productionType.fabricType')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Fabric type must be between 1 and 100 characters'),

  // Para localized: variantes obrigatórias
  body('productionType.variants')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Variants must be an array with at least one item'),

  body('productionType.variants.*.variantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant name must be between 1 and 100 characters'),

  body('productionType.variants.*.fabricType')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant fabric type must be between 1 and 100 characters'),

  body('productionType.variants.*.quantities')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Quantities must be an array with at least one item'),

  body('productionType.variants.*.quantities.*.size')
    .optional()
    .isIn(['PP', 'P', 'M', 'G', 'G1', 'G2'])
    .withMessage('Size must be one of: PP, P, M, G, G1, G2'),

  body('productionType.variants.*.quantities.*.value')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity value must be a positive integer'),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observations must have maximum 1000 characters')
    .trim(),

  body('hasCraft')
    .optional()
    .isBoolean()
    .withMessage('Has craft must be a boolean'),

  body('fabricWidth')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Fabric width must be between 0 and 500'),

  body('status')
    .optional()
    .isIn(['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'])
    .withMessage('Status must be: CREATED, PILOT_PRODUCTION, PILOT_SENT, PILOT_APPROVED, PRODUCTION_STARTED, or FINALIZED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validações para atualização de production order
const validateUpdateProductionOrder = [
  body('developmentId')
    .optional()
    .isMongoId()
    .withMessage('Development ID must be a valid MongoDB ObjectId'),

  body('productionType')
    .optional()
    .isObject()
    .withMessage('Production type must be an object'),

  body('productionType.type')
    .optional()
    .isIn(['rotary', 'localized'])
    .withMessage('Production type must be rotary or localized'),

  // Para rotary: metros e fabricType
  body('productionType.meters')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Meters must be a positive number'),

  body('productionType.fabricType')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Fabric type must be between 1 and 100 characters'),

  // Para localized: variantes
  body('productionType.variants')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Variants must be an array with at least one item'),

  body('productionType.variants.*.variantName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant name must be between 1 and 100 characters'),

  body('productionType.variants.*.fabricType')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Variant fabric type must be between 1 and 100 characters'),

  body('productionType.variants.*.quantities')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Quantities must be an array with at least one item'),

  body('productionType.variants.*.quantities.*.size')
    .optional()
    .isIn(['PP', 'P', 'M', 'G', 'G1', 'G2'])
    .withMessage('Size must be one of: PP, P, M, G, G1, G2'),

  body('productionType.variants.*.quantities.*.value')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity value must be a positive integer'),

  body('observations')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Observations must have maximum 1000 characters')
    .trim(),

  body('hasCraft')
    .optional()
    .isBoolean()
    .withMessage('Has craft must be a boolean'),

  body('fabricWidth')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Fabric width must be between 0 and 500'),

  body('status')
    .optional()
    .isIn(['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'])
    .withMessage('Status must be: CREATED, PILOT_PRODUCTION, PILOT_SENT, PILOT_APPROVED, PRODUCTION_STARTED, or FINALIZED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação customizada para production type
const validateAndTransformProductionType = (req, res, next) => {
  try {
    const { productionType } = req.body;

    if (!productionType) {
      return next();
    }

    // Validações específicas por tipo
    if (productionType.type === 'rotary') {
      // Para rotary: metros e fabricType são obrigatórios
      if (!productionType.meters || productionType.meters <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Metros são obrigatórios para tipo de produção rotativa'
        });
      }
      if (!productionType.fabricType || productionType.fabricType.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Tipo de tecido é obrigatório para tipo de produção rotativa'
        });
      }
    } else if (productionType.type === 'localized') {
      // Para localized: variantes são obrigatórias
      if (!productionType.variants || !Array.isArray(productionType.variants) || productionType.variants.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Pelo menos uma variante é obrigatória para tipo de produção localizada'
        });
      }

      // Validar cada variante
      for (let i = 0; i < productionType.variants.length; i++) {
        const variant = productionType.variants[i];
        
        if (!variant.variantName || variant.variantName.trim() === '') {
          return res.status(400).json({
            success: false,
            message: `Variant ${i + 1}: variant name is required`
          });
        }
        
        if (!variant.fabricType || variant.fabricType.trim() === '') {
          return res.status(400).json({
            success: false,
            message: `Variant ${i + 1}: fabric type is required`
          });
        }
        
        if (!variant.quantities || !Array.isArray(variant.quantities) || variant.quantities.length === 0) {
          return res.status(400).json({
            success: false,
            message: `Variant ${i + 1}: at least one quantity is required`
          });
        }

        // Quantidades são aceitas sem validação - aceitar qualquer valor do usuário
      }
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao processar tipo de produção',
      error: error.message
    });
  }
};

// Validação para atualização de status de production order
const validateStatusUpdateProductionOrder = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'])
    .withMessage('Status must be: CREATED, PILOT_PRODUCTION, PILOT_SENT, PILOT_APPROVED, PRODUCTION_STARTED, or FINALIZED')
];

module.exports = {
  validateCreateProductionOrder,
  validateUpdateProductionOrder,
  validateStatusUpdateProductionOrder,
  validateAndTransformProductionType
};