// Importar todas as validações
const commonValidation = require('./commonValidation');
const clientValidation = require('./clientValidation');
const developmentValidation = require('./developmentValidation');
const productionOrderValidation = require('./productionOrderValidation');
const productionSheetValidation = require('./productionSheetValidation');
const productionReceiptValidation = require('./productionReceiptValidation');
const userValidation = require('./userValidation');

// Exportar todas as validações organizadas por entidade
module.exports = {
  // Common validations
  ...commonValidation,
  
  // Client validations
  ...clientValidation,
  
  // Development validations
  ...developmentValidation,
  
  // Production Order validations
  ...productionOrderValidation,
  
  // Production Sheet validations
  ...productionSheetValidation,
  
  // Production Receipt validations
  ...productionReceiptValidation,
  
  // User validations
  ...userValidation
};
