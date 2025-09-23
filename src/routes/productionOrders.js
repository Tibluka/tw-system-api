const express = require('express');
const rateLimit = require('express-rate-limit');
const productionOrderController = require('../controllers/productionOrderController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const {
  validateCreateProductionOrder,
  validateUpdateProductionOrder,
  validateStatusUpdateProductionOrder
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for production order operations
const productionOrderLimiter = rateLimit({
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
router.use(productionOrderLimiter);

// @route   GET /api/v1/production-orders
// @desc    Get all production orders with pagination and filters
// @access  Private
router.get('/', 
  validatePagination, 
  productionOrderController.index
);

// @route   GET /api/v1/production-orders/stats
// @desc    Get production order statistics
// @access  Private
router.get('/stats', 
  productionOrderController.stats
);

// @route   GET /api/v1/production-orders/by-development/:developmentId
// @desc    Get production order by development ID
// @access  Private
router.get('/by-development/:developmentId', 
  validateObjectId, 
  productionOrderController.getByDevelopment
);

// @route   GET /api/v1/production-orders/:id
// @desc    Get production order by ID or internalReference
// @access  Private
router.get('/:id', 
  productionOrderController.show
);

// @route   POST /api/v1/production-orders
// @desc    Create new production order
// @access  Private
router.post('/', 
  validateCreateProductionOrder,
  productionOrderController.store
);

// @route   PUT /api/v1/production-orders/:id
// @desc    Update production order
// @access  Private
router.put('/:id', 
  validateObjectId,
  validateUpdateProductionOrder,
  productionOrderController.update
);

// @route   PATCH /api/v1/production-orders/:id/status
// @desc    Update only production order status
// @access  Private
router.patch('/:id/status', 
  validateObjectId,
  validateStatusUpdateProductionOrder,
  productionOrderController.updateStatus
);

// @route   PATCH /api/v1/production-orders/:id/priority
// @desc    Update only production order priority
// @access  Private
router.patch('/:id/priority', 
  validateObjectId,
  productionOrderController.updatePriority
);

// @route   POST /api/v1/production-orders/:id/activate
// @desc    Reactivate production order
// @access  Private
router.post('/:id/activate', 
  validateObjectId, 
  productionOrderController.activate
);

// @route   DELETE /api/v1/production-orders/:id
// @desc    Deactivate production order (soft delete)
// @access  Private
router.delete('/:id', 
  validateObjectId, 
  productionOrderController.destroy
);

module.exports = router;