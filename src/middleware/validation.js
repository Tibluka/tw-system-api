// Importar todas as validações organizadas
const validations = require('./validations');

// Exportar todas as validações para manter compatibilidade
module.exports = {
  // Common validations
  validatePagination: validations.validatePagination,
  validateObjectId: validations.validateObjectId,
  validateSearch: validations.validateSearch,
  validateDateRange: validations.validateDateRange,

  // User validations
  validateLogin: validations.validateLogin,
  validateRegister: validations.validateRegister,
  validateCreateUser: validations.validateCreateUser,
  validateUpdateUser: validations.validateUpdateUser,
  validateChangePassword: validations.validateChangePassword,
  validateResetPassword: validations.validateResetPassword,
  validateConfirmResetPassword: validations.validateConfirmResetPassword,

  // Client validations
  validateCreateClient: validations.validateCreateClient,
  validateUpdateClient: validations.validateUpdateClient,

  // Development validations
  validateCreateDevelopment: validations.validateCreateDevelopment,
  validateUpdateDevelopment: validations.validateUpdateDevelopment,
  validateAndTransformProductionType: validations.validateAndTransformProductionType,
  validateStatusUpdate: validations.validateStatusUpdate,

  // Production Order validations
  validateCreateProductionOrder: validations.validateCreateProductionOrder,
  validateUpdateProductionOrder: validations.validateUpdateProductionOrder,
  validateStatusUpdateProductionOrder: validations.validateStatusUpdateProductionOrder,
  validateAndTransformProductionType: validations.validateAndTransformProductionType,

  // Production Sheet validations
  validateCreateProductionSheet: validations.validateCreateProductionSheet,
  validateUpdateProductionSheet: validations.validateUpdateProductionSheet,
  validateStageUpdateProductionSheet: validations.validateStageUpdateProductionSheet,
  validateMachineAvailability: validations.validateMachineAvailability,

  // Production Receipt validations
  validateCreateProductionReceipt: validations.validateCreateProductionReceipt,
  validateUpdateProductionReceipt: validations.validateUpdateProductionReceipt,
  validatePaymentStatusUpdateProductionReceipt: validations.validatePaymentStatusUpdateProductionReceipt,
  validateProcessPayment: validations.validateProcessPayment,

  // Delivery Sheet validations
  validateCreateDeliverySheet: validations.validateCreateDeliverySheet,
  validateUpdateDeliverySheet: validations.validateUpdateDeliverySheet,
  validateStatusUpdateDeliverySheet: validations.validateStatusUpdateDeliverySheet
};
