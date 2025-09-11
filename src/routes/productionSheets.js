const express = require('express');
const rateLimit = require('express-rate-limit');
const productionSheetController = require('../controllers/productionSheetController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const {
  validateCreateProductionSheet,
  validateUpdateProductionSheet,
  validateStageUpdateProductionSheet,
  validateMachineAvailability
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for production sheet operations
const productionSheetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // maximum 150 requests per IP (mais que outras entidades pois operadores usam muito)
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
router.use(productionSheetLimiter);

// @route   GET /api/v1/production-sheets
// @desc    Get all production sheets with pagination and filters
// @access  Private
router.get('/', 
  validatePagination, 
  productionSheetController.index
);

// @route   GET /api/v1/production-sheets/stats
// @desc    Get production sheet statistics
// @access  Private
router.get('/stats', 
  productionSheetController.stats
);

// @route   GET /api/v1/production-sheets/by-production-order/:productionOrderId
// @desc    Get production sheet by production order ID
// @access  Private
router.get('/by-production-order/:productionOrderId', 
  validateObjectId, 
  productionSheetController.getByProductionOrder
);

// @route   GET /api/v1/production-sheets/by-machine/:machineNumber
// @desc    Get production sheets by machine number
// @access  Private
router.get('/by-machine/:machineNumber', 
  productionSheetController.getByMachine
);

// @route   GET /api/v1/production-sheets/:id
// @desc    Get production sheet by ID or internalReference
// @access  Private
router.get('/:id', 
  productionSheetController.show
);

// @route   POST /api/v1/production-sheets
// @desc    Create new production sheet
// @access  Private
router.post('/', 
  validateCreateProductionSheet,
  validateMachineAvailability,
  productionSheetController.store
);

// @route   PUT /api/v1/production-sheets/:id
// @desc    Update production sheet
// @access  Private
router.put('/:id', 
  validateObjectId,
  validateUpdateProductionSheet,
  validateMachineAvailability,
  productionSheetController.update
);

// @route   PATCH /api/v1/production-sheets/:id/stage
// @desc    Update only production sheet stage
// @access  Private
router.patch('/:id/stage', 
  validateObjectId,
  validateStageUpdateProductionSheet,
  productionSheetController.updateStage
);

// @route   PATCH /api/v1/production-sheets/:id/advance-stage
// @desc    Advance production sheet to next stage
// @access  Private
router.patch('/:id/advance-stage', 
  validateObjectId,
  productionSheetController.advanceStage
);

// @route   POST /api/v1/production-sheets/:id/activate
// @desc    Reactivate production sheet
// @access  Private
router.post('/:id/activate', 
  validateObjectId, 
  productionSheetController.activate
);

// @route   DELETE /api/v1/production-sheets/:id
// @desc    Deactivate production sheet (soft delete)
// @access  Private
router.delete('/:id', 
  validateObjectId, 
  productionSheetController.destroy
);

module.exports = router;