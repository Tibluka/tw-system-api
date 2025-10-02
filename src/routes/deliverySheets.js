const express = require('express');
const router = express.Router();
const deliverySheetController = require('../controllers/deliverySheetController');
const { authenticate } = require('../middleware/auth');
const { 
  validateCreateDeliverySheet, 
  validateUpdateDeliverySheet, 
  validateStatusUpdateDeliverySheet,
  validateObjectId 
} = require('../middleware/validation');

// Aplicar autenticação em todas as rotas
router.use(authenticate);

// GET /delivery-sheets - List all delivery sheets
router.get('/', deliverySheetController.index);

// GET /delivery-sheets/:id - Get single delivery sheet (accepts both ObjectId and internalReference)
router.get('/:id', deliverySheetController.show);

// POST /delivery-sheets - Create new delivery sheet
router.post('/', validateCreateDeliverySheet, deliverySheetController.store);

// PUT /delivery-sheets/:id - Update delivery sheet
router.put('/:id', validateObjectId, validateUpdateDeliverySheet, deliverySheetController.update);

// PUT /delivery-sheets/:id/status - Update delivery status
router.patch('/:id/status', validateObjectId, validateStatusUpdateDeliverySheet, deliverySheetController.updateStatus);

// DELETE /delivery-sheets/:id - Soft delete delivery sheet
router.delete('/:id', validateObjectId, deliverySheetController.destroy);

module.exports = router;
