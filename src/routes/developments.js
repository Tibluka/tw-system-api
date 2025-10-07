const express = require('express');
const rateLimit = require('express-rate-limit');
const developmentController = require('../controllers/developmentController');
const { authenticate } = require('../middleware/auth');
const { checkResourceAccess, checkCreatePermission } = require('../middleware/permissions');
const { upload } = require('../config/cloudinary'); // Import upload middleware
const { validateObjectId, validatePagination } = require('../middleware/validation');
const {
  validateCreateDevelopment,
  validateUpdateDevelopment,
  validateAndTransformProductionType,
  validateStatusUpdate
} = require('../middleware/validation');

const router = express.Router();

// Rate limiting for development operations
const developmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // maximum 100 requests per IP
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all routes
router.use((req, res, next) => {
  // Pular autenticação para rotas de imagem
  if (req.path.includes('/image')) {
    return next();
  }
  authenticate(req, res, next);
});

// Apply rate limiting to all routes
router.use(developmentLimiter);

// Apply resource access check to all routes - DEFAULT and ADMIN can access
router.use(checkResourceAccess('developments'));

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
  developmentController.store
);

// @route   PUT /api/v1/developments/:id
// @desc    Update development
// @access  Private
router.put('/:id', 
  validateObjectId,
  validateUpdateDevelopment,
  validateAndTransformProductionType,
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
  validateObjectId,
  upload.single('image'), // 'image' é o nome do campo no FormData
  developmentController.uploadImage
);

router.delete(
  '/:id/image',
  validateObjectId,
  developmentController.removeImage
);

router.get(
  '/:id/image',
  validateObjectId,
  developmentController.getImage
);


router.post('/:id/test-upload', (req, res) => {
  const start = Date.now();
  
  // Upload direto via Cloudinary API
  const formidable = require('formidable');
  const form = new formidable.IncomingForm();
  
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const file = files.image;
    if (!file) {
      return res.status(400).json({ error: 'No file' });
    }
    
    // Upload direto
    cloudinary.uploader.upload(file.filepath, {
      folder: 'tw-system/test',
      quality: 'auto:low',
      width: 600,
      height: 600,
      crop: 'limit'
    }, (error, result) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      const totalTime = Date.now() - start;
      console.log(`🚀 UPLOAD DIRETO: ${totalTime}ms`);
      
      res.json({
        success: true,
        url: result.secure_url,
        time: `${totalTime}ms`,
        method: 'direct-api'
      });
    });
  });
});

module.exports = router;