const { body, param, query } = require('express-validator');

// Validação para paginação
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isString()
    .withMessage('SortBy must be a string'),

  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc')
];

// Validação para ObjectId
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

// Validação para busca
const validateSearch = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ max: 100 })
    .withMessage('Search term too long')
];

// Validação para filtros de data
const validateDateRange = [
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('CreatedFrom must be a valid date'),

  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('CreatedTo must be a valid date')
];

module.exports = {
  validatePagination,
  validateObjectId,
  validateSearch,
  validateDateRange
};
