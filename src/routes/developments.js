const express = require('express');
const rateLimit = require('express-rate-limit');
const developmentController = require('../controllers/developmentController');
const { authenticate } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const {
  validateCreateDevelopment,
  validateUpdateDevelopment,
  validateProductionType,
  validateStatusUpdate
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for development operations
const developmentLimiter = rateLimit({
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
router.use(developmentLimiter);

// @route   GET /api/v1/developments
// @desc    Get all developments with pagination and filters
// @access  Private
router.get('/', 
  validatePagination, 
  developmentController.index
);

// @route   GET /api/v1/developments/stats
// @desc    Get development statistics
// @access  Private
router.get('/stats', 
  developmentController.stats
);

// @route   GET /api/v1/developments/reference/:internalReference
// @desc    Get development by internal reference
// @access  Private
router.get('/reference/:internalReference', 
  developmentController.showByReference
);

// @route   GET /api/v1/developments/by-client/:clientId
// @desc    Get developments by client ID
// @access  Private
router.get('/by-client/:clientId', 
  validateObjectId, 
  developmentController.getByClient
);

// @route   GET /api/v1/developments/:id
// @desc    Get development by ID
// @access  Private
router.get('/:id', 
  developmentController.show
);

// @route   POST /api/v1/developments
// @desc    Create new development
// @access  Private
router.post('/', 
  validateCreateDevelopment,
  validateProductionType,
  developmentController.store
);

// @route   PUT /api/v1/developments/:id
// @desc    Update development
// @access  Private
router.put('/:id', 
  validateObjectId,
  validateUpdateDevelopment,
  developmentController.update
);

// @route   PATCH /api/v1/developments/:id/status
// @desc    Update only development status
// @access  Private
router.patch('/:id/status', 
  validateObjectId,
  validateStatusUpdate,
  developmentController.updateStatus
);

// @route   POST /api/v1/developments/:id/activate
// @desc    Reactivate development
// @access  Private
router.post('/:id/activate', 
  validateObjectId, 
  developmentController.activate
);

// @route   DELETE /api/v1/developments/:id
// @desc    Deactivate development (soft delete)
// @access  Private
router.delete('/:id', 
  validateObjectId, 
  developmentController.destroy
);

// ROTAS PARA IMAGEM DA PEÇA
router.post(
  '/:id/image', 
  requireAuth,
  upload.single('image'), // 'image' é o nome do campo no FormData
  developmentController.uploadImage
);

router.delete(
  '/:id/image',
  requireAuth,
  developmentController.removeImage
);

router.get(
  '/:id/image',
  requireAuth,
  developmentController.getImage
);

module.exports = router;