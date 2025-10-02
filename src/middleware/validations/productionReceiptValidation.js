const { body } = require('express-validator');

// Validações para criação de production receipt
const validateCreateProductionReceipt = [
  body('deliverySheetId')
    .notEmpty()
    .withMessage('Delivery sheet ID is required')
    .isMongoId()
    .withMessage('Delivery sheet ID must be a valid MongoDB ObjectId'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'])
    .withMessage('Payment method must be: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX, or CHECK'),

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
    .withMessage('Paid amount must be a positive number'),

  body('issueDate')
    .optional()
    .isISO8601()
    .withMessage('Issue date must be a valid date'),

  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid date'),

  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must have maximum 1000 characters')
    .trim(),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validações para atualização de production receipt
const validateUpdateProductionReceipt = [
  body('productionOrderId')
    .optional()
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'])
    .withMessage('Payment method must be: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX, or CHECK'),

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

// Validação para atualização de status de pagamento
const validatePaymentStatusUpdateProductionReceipt = [
  body('paymentStatus')
    .notEmpty()
    .withMessage('Payment status is required')
    .isIn(['PENDING', 'PAID'])
    .withMessage('Payment status must be: PENDING or PAID'),

  body('paymentDate').optional().isISO8601().withMessage('Payment date must be a valid date')
];

// Validação para processamento de pagamento
const validateProcessPayment = [
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid date')
];

module.exports = {
  validateCreateProductionReceipt,
  validateUpdateProductionReceipt,
  validatePaymentStatusUpdateProductionReceipt,
  validateProcessPayment
};
