const { body } = require('express-validator');

// Validações para criação de production order
const validateCreateProductionOrder = [
  body('developmentId')
    .notEmpty()
    .withMessage('Development ID is required')
    .isMongoId()
    .withMessage('Development ID must be a valid MongoDB ObjectId'),

  body('productionType.rotary.enabled')
    .optional()
    .isBoolean()
    .withMessage('Rotary enabled must be a boolean'),

  body('productionType.rotary.meters')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Rotary meters must be at least 0.1'),

  body('productionType.rotary.negotiatedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negotiated price must be positive'),

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

  body('hasCraft')
    .optional()
    .isBoolean()
    .withMessage('HasCraft must be a boolean'),

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

  body('productionType.rotary.enabled')
    .optional()
    .isBoolean()
    .withMessage('Rotary enabled must be a boolean'),

  body('productionType.rotary.meters')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Rotary meters must be at least 0.1'),

  body('productionType.rotary.negotiatedPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negotiated price must be positive'),

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

  body('hasCraft')
    .optional()
    .isBoolean()
    .withMessage('HasCraft must be a boolean'),

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
  validateStatusUpdateProductionOrder
};
