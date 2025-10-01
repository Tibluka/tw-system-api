const { body } = require('express-validator');

// Validações para criação de production sheet
const validateCreateProductionSheet = [
  body('productionOrderId')
    .notEmpty()
    .withMessage('Production order ID is required')
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  // internalReference NÃO é obrigatório aqui - será copiado automaticamente da ProductionOrder

  body('entryDate').optional().isISO8601().withMessage('Entry date must be a valid date'),

  body('expectedExitDate')
    .notEmpty()
    .withMessage('Expected exit date is required')
    .isISO8601()
    .withMessage('Expected exit date must be a valid date')
    .custom((value, { req }) => {
      // Verificar se expectedExitDate é posterior a entryDate
      const entryDate = req.body.entryDate ? new Date(req.body.entryDate) : new Date();
      const expectedExitDate = new Date(value);

      if (expectedExitDate <= entryDate) {
        throw new Error('Expected exit date must be after entry date');
      }
      return true;
    }),

  body('machine')
    .notEmpty()
    .withMessage('Machine is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('Machine must be 1, 2, 3, or 4'),

  body('stage')
    .optional()
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED'),

  body('productionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Production notes must have maximum 1000 characters')
    .trim(),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Temperature must be between 0 and 500'),

  body('velocity')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Velocity must be between 0 and 1000'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validações para atualização de production sheet
const validateUpdateProductionSheet = [
  body('productionOrderId')
    .optional()
    .isMongoId()
    .withMessage('Production order ID must be a valid MongoDB ObjectId'),

  body('entryDate').optional().isISO8601().withMessage('Entry date must be a valid date'),

  body('expectedExitDate')
    .optional()
    .isISO8601()
    .withMessage('Expected exit date must be a valid date')
    .custom((value, { req }) => {
      // Verificar se expectedExitDate é posterior a entryDate (se ambos fornecidos)
      if (req.body.entryDate && value) {
        const entryDate = new Date(req.body.entryDate);
        const expectedExitDate = new Date(value);

        if (expectedExitDate <= entryDate) {
          throw new Error('Expected exit date must be after entry date');
        }
      }
      return true;
    }),

  body('machine').optional().isInt({ min: 1, max: 4 }).withMessage('Machine must be 1, 2, 3, or 4'),

  body('stage')
    .optional()
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED'),

  body('productionNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Production notes must have maximum 1000 characters')
    .trim(),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 500 })
    .withMessage('Temperature must be between 0 and 500'),

  body('velocity')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Velocity must be between 0 and 1000'),

  body('active').optional().isBoolean().withMessage('Active field must be a boolean')
];

// Validação para atualização de stage
const validateStageUpdateProductionSheet = [
  body('stage')
    .notEmpty()
    .withMessage('Stage is required')
    .isIn(['PRINTING', 'CALENDERING', 'FINISHED'])
    .withMessage('Stage must be: PRINTING, CALENDERING, or FINISHED')
];

// Validação customizada para verificar disponibilidade da máquina
const validateMachineAvailability = async (req, res, next) => {
  try {
    const { machine, entryDate, expectedExitDate } = req.body;
    const ProductionSheet = require('../../models/ProductionSheet');

    if (!machine || !entryDate || !expectedExitDate) {
      return next(); // Deixar outras validações tratarem campos obrigatórios
    }

    const entry = new Date(entryDate);
    const exit = new Date(expectedExitDate);

    // Verificar se há conflitos de horário na mesma máquina
    const conflictingSheets = await ProductionSheet.find({
      machine: parseInt(machine),
      active: true,
      _id: { $ne: req.params.id }, // Excluir o próprio sheet se for update
      $or: [
        {
          entryDate: { $lte: exit },
          expectedExitDate: { $gte: entry }
        }
      ]
    });

    if (conflictingSheets.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Máquina ${machine} já está ocupada no período selecionado`,
        conflictingSheets: conflictingSheets.map(sheet => ({
          id: sheet._id,
          internalReference: sheet.internalReference,
          entryDate: sheet.entryDate,
          expectedExitDate: sheet.expectedExitDate
        }))
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking machine availability',
      error: error.message
    });
  }
};

module.exports = {
  validateCreateProductionSheet,
  validateUpdateProductionSheet,
  validateStageUpdateProductionSheet,
  validateMachineAvailability
};
