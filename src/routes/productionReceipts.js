const express = require('express');
const rateLimit = require('express-rate-limit');
const productionReceiptController = require('../controllers/productionReceiptController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const {
  validateCreateProductionReceipt,
  validateUpdateProductionReceipt,
  validatePaymentStatusUpdateProductionReceipt,
  validateProcessPayment
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for production receipt operations
const productionReceiptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // maximum 100 requests per IP
  message: {
    success: false,
    message: 'Too many requests. Try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting to all routes
router.use(productionReceiptLimiter);

// @route   GET /api/v1/production-receipts
// @desc    Get all production receipts with pagination and filters
// @access  Private
router.get('/', 
  validatePagination, 
  productionReceiptController.index
);

// @route   GET /api/v1/production-receipts/stats
// @desc    Get production receipt statistics
// @access  Private
router.get('/stats', 
  productionReceiptController.stats
);

// @route   GET /api/v1/production-receipts/overdue
// @desc    Get overdue production receipts
// @access  Private
router.get('/overdue', 
  productionReceiptController.getOverdue
);

// @route   GET /api/v1/production-receipts/by-production-order/:productionOrderId
// @desc    Get production receipt by production order ID
// @access  Private
router.get('/by-production-order/:productionOrderId', 
  validateObjectId, 
  productionReceiptController.getByProductionOrder
);

// @route   GET /api/v1/production-receipts/:id
// @desc    Get production receipt by ID or internalReference
// @access  Private
router.get('/:id', 
  productionReceiptController.show
);

// @route   POST /api/v1/production-receipts
// @desc    Create new production receipt
// @access  Private
router.post('/', 
  validateCreateProductionReceipt,
  productionReceiptController.store
);

// @route   PUT /api/v1/production-receipts/:id
// @desc    Update production receipt
// @access  Private
router.put('/:id', 
  validateObjectId,
  validateUpdateProductionReceipt,
  productionReceiptController.update
);

// @route   POST /api/v1/production-receipts/:id/process-payment
// @desc    Process payment for production receipt
// @access  Private
router.post('/:id/process-payment', 
  validateObjectId,
  validateProcessPayment,
  productionReceiptController.processPayment
);

// @route   PATCH /api/v1/production-receipts/:id/payment-status
// @desc    Update only production receipt payment status
// @access  Private
router.patch('/:id/payment-status', 
  validateObjectId,
  validatePaymentStatusUpdateProductionReceipt,
  productionReceiptController.updatePaymentStatus
);

// @route   POST /api/v1/production-receipts/:id/activate
// @desc    Reactivate production receipt
// @access  Private
router.post('/:id/activate', 
  validateObjectId, 
  productionReceiptController.activate
);

// @route   DELETE /api/v1/production-receipts/:id
// @desc    Deactivate production receipt (soft delete)
// @access  Private
router.delete('/:id', 
  validateObjectId, 
  productionReceiptController.destroy
);

module.exports = router;