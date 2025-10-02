const { body, param } = require('express-validator');
const mongoose = require('mongoose');

// Validação para criação de delivery sheet
const validateCreateDeliverySheet = [
  body('productionSheetId')
    .notEmpty()
    .withMessage('Production sheet ID is required')
    .isMongoId()
    .withMessage('Production sheet ID must be a valid MongoDB ObjectId'),

  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Delivery date must be a valid date'),

  body('totalValue')
    .notEmpty()
    .withMessage('Total value is required')
    .isFloat({ min: 0 })
    .withMessage('Total value must be a positive number'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must have maximum 1000 characters')
    .trim(),

  body('invoiceNumber')
    .notEmpty()
    .withMessage('Invoice number is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Invoice number must be between 1 and 50 characters')
    .trim(),

  // Validação do endereço
  body('address.street')
    .notEmpty()
    .withMessage('Street is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Street must be between 2 and 200 characters')
    .trim(),

  body('address.number')
    .notEmpty()
    .withMessage('Number is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Number must be between 1 and 20 characters')
    .trim(),

  body('address.complement')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Complement must have maximum 100 characters')
    .trim(),

  body('address.neighborhood')
    .notEmpty()
    .withMessage('Neighborhood is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Neighborhood must be between 2 and 100 characters')
    .trim(),

  body('address.city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .trim(),

  body('address.state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ min: 2, max: 2 })
    .withMessage('State must have exactly 2 characters')
    .isUppercase()
    .withMessage('State must be uppercase')
    .trim(),

  body('address.zipCode')
    .notEmpty()
    .withMessage('ZIP code is required')
    .isLength({ min: 8, max: 10 })
    .withMessage('ZIP code must be between 8 and 10 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['CREATED', 'ON_ROUTE', 'DELIVERED'])
    .withMessage('Status must be: CREATED, ON_ROUTE, or DELIVERED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação para atualização de delivery sheet
const validateUpdateDeliverySheet = [
  body('deliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Delivery date must be a valid date'),

  body('totalValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total value must be a positive number'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must have maximum 1000 characters')
    .trim(),

  body('invoiceNumber')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invoice number must be between 1 and 50 characters')
    .trim(),

  // Validação do endereço (opcional na atualização)
  body('address.street')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Street must be between 2 and 200 characters')
    .trim(),

  body('address.number')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Number must be between 1 and 20 characters')
    .trim(),

  body('address.complement')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Complement must have maximum 100 characters')
    .trim(),

  body('address.neighborhood')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Neighborhood must be between 2 and 100 characters')
    .trim(),

  body('address.city')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters')
    .trim(),

  body('address.state')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('State must have exactly 2 characters')
    .isUppercase()
    .withMessage('State must be uppercase')
    .trim(),

  body('address.zipCode')
    .optional()
    .isLength({ min: 8, max: 10 })
    .withMessage('ZIP code must be between 8 and 10 characters')
    .trim(),

  body('status')
    .optional()
    .isIn(['CREATED', 'ON_ROUTE', 'DELIVERED'])
    .withMessage('Status must be: CREATED, ON_ROUTE, or DELIVERED'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação para atualização de status
const validateStatusUpdateDeliverySheet = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['CREATED', 'ON_ROUTE', 'DELIVERED'])
    .withMessage('Status must be: CREATED, ON_ROUTE, or DELIVERED')
];

module.exports = {
  validateCreateDeliverySheet,
  validateUpdateDeliverySheet,
  validateStatusUpdateDeliverySheet
};