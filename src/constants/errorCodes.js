// Códigos de erro padronizados para a API
// Formato: [Categoria][Subcategoria][Sequencial]
// Categoria: 1=Validação, 2=Negócio, 3=Autenticação, 4=Autorização, 5=Recurso, 6=Sistema

const ERROR_CODES = {
  // VALIDAÇÃO (1xxx)
  VALIDATION_ERROR: 1001,
  INVALID_DATA: 1002,
  MISSING_REQUIRED_FIELD: 1003,
  INVALID_EMAIL_FORMAT: 1004,
  INVALID_PASSWORD_FORMAT: 1005,
  INVALID_DATE_FORMAT: 1006,
  INVALID_OBJECT_ID: 1007,
  INVALID_ENUM_VALUE: 1008,
  INVALID_STRING_LENGTH: 1009,
  INVALID_NUMBER_RANGE: 1010,
  INVALID_ARRAY_LENGTH: 1011,
  INVALID_FILE_TYPE: 1012,
  INVALID_FILE_SIZE: 1013,

  // NEGÓCIO (2xxx)
  DEVELOPMENT_NOT_APPROVED: 2001,
  PRODUCTION_ORDER_ALREADY_EXISTS: 2002,
  DELIVERY_SHEET_ALREADY_EXISTS: 2003,
  PRODUCTION_RECEIPT_ALREADY_EXISTS: 2004,
  INSUFFICIENT_PERMISSIONS: 2005,
  OPERATION_NOT_ALLOWED: 2006,
  BUSINESS_RULE_VIOLATION: 2007,
  DUPLICATE_ENTRY: 2008,
  INVALID_STATUS_TRANSITION: 2009,
  RESOURCE_IN_USE: 2010,
  INVALID_PRODUCTION_TYPE: 2011,
  MISSING_PRODUCTION_DATA: 2012,

  // AUTENTICAÇÃO (3xxx)
  AUTHENTICATION_REQUIRED: 3001,
  INVALID_CREDENTIALS: 3002,
  TOKEN_EXPIRED: 3003,
  TOKEN_INVALID: 3004,
  ACCOUNT_DISABLED: 3005,
  ACCOUNT_LOCKED: 3006,
  SESSION_EXPIRED: 3007,

  // AUTORIZAÇÃO (4xxx)
  INSUFFICIENT_PERMISSIONS: 4001,
  ROLE_REQUIRED: 4002,
  ADMIN_REQUIRED: 4003,
  RESOURCE_ACCESS_DENIED: 4004,

  // RECURSOS (5xxx)
  USER_NOT_FOUND: 5001,
  CLIENT_NOT_FOUND: 5002,
  DEVELOPMENT_NOT_FOUND: 5003,
  PRODUCTION_ORDER_NOT_FOUND: 5004,
  PRODUCTION_SHEET_NOT_FOUND: 5005,
  DELIVERY_SHEET_NOT_FOUND: 5006,
  PRODUCTION_RECEIPT_NOT_FOUND: 5007,
  FILE_NOT_FOUND: 5008,
  RESOURCE_NOT_FOUND: 5009,

  // SISTEMA (6xxx)
  DATABASE_ERROR: 6001,
  EXTERNAL_SERVICE_ERROR: 6002,
  FILE_UPLOAD_ERROR: 6003,
  EMAIL_SEND_ERROR: 6004,
  INTERNAL_SERVER_ERROR: 6005,
  SERVICE_UNAVAILABLE: 6006,
  TIMEOUT_ERROR: 6007,
  NETWORK_ERROR: 6008,
  CONFIGURATION_ERROR: 6009,
  RATE_LIMIT_EXCEEDED: 6010
};

// Mapeamento de mensagens de erro para códigos
const ERROR_MESSAGE_TO_CODE = {
  // Validação
  'Invalid data': ERROR_CODES.INVALID_DATA,
  'Validation error': ERROR_CODES.VALIDATION_ERROR,
  'Required field is missing': ERROR_CODES.MISSING_REQUIRED_FIELD,
  'Invalid email format': ERROR_CODES.INVALID_EMAIL_FORMAT,
  'Invalid password format': ERROR_CODES.INVALID_PASSWORD_FORMAT,
  'Invalid date format': ERROR_CODES.INVALID_DATE_FORMAT,
  'Invalid ObjectId': ERROR_CODES.INVALID_OBJECT_ID,
  'Invalid enum value': ERROR_CODES.INVALID_ENUM_VALUE,
  'String length invalid': ERROR_CODES.INVALID_STRING_LENGTH,
  'Number out of range': ERROR_CODES.INVALID_NUMBER_RANGE,
  'Array length invalid': ERROR_CODES.INVALID_ARRAY_LENGTH,
  'Invalid file type': ERROR_CODES.INVALID_FILE_TYPE,
  'File too large': ERROR_CODES.INVALID_FILE_SIZE,

  // Negócio
  'Development must be approved to create production order': ERROR_CODES.DEVELOPMENT_NOT_APPROVED,
  'Production order already exists for this development': ERROR_CODES.PRODUCTION_ORDER_ALREADY_EXISTS,
  'Delivery sheet already exists for this production sheet': ERROR_CODES.DELIVERY_SHEET_ALREADY_EXISTS,
  'Production receipt already exists for this delivery sheet': ERROR_CODES.PRODUCTION_RECEIPT_ALREADY_EXISTS,
  'Insufficient permissions': ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  'Operation not allowed': ERROR_CODES.OPERATION_NOT_ALLOWED,
  'Business rule violation': ERROR_CODES.BUSINESS_RULE_VIOLATION,
  'Duplicate entry': ERROR_CODES.DUPLICATE_ENTRY,
  'Invalid status transition': ERROR_CODES.INVALID_STATUS_TRANSITION,
  'Resource in use': ERROR_CODES.RESOURCE_IN_USE,
  'Invalid production type': ERROR_CODES.INVALID_PRODUCTION_TYPE,
  'Missing production data': ERROR_CODES.MISSING_PRODUCTION_DATA,

  // Autenticação
  'Authentication required': ERROR_CODES.AUTHENTICATION_REQUIRED,
  'Invalid credentials': ERROR_CODES.INVALID_CREDENTIALS,
  'Token expired': ERROR_CODES.TOKEN_EXPIRED,
  'Invalid token': ERROR_CODES.TOKEN_INVALID,
  'Account disabled': ERROR_CODES.ACCOUNT_DISABLED,
  'Account locked': ERROR_CODES.ACCOUNT_LOCKED,
  'Session expired': ERROR_CODES.SESSION_EXPIRED,

  // Autorização
  'Insufficient permissions': ERROR_CODES.INSUFFICIENT_PERMISSIONS,
  'Role required': ERROR_CODES.ROLE_REQUIRED,
  'Admin required': ERROR_CODES.ADMIN_REQUIRED,
  'Resource access denied': ERROR_CODES.RESOURCE_ACCESS_DENIED,

  // Recursos
  'User not found': ERROR_CODES.USER_NOT_FOUND,
  'Client not found': ERROR_CODES.CLIENT_NOT_FOUND,
  'Development not found': ERROR_CODES.DEVELOPMENT_NOT_FOUND,
  'Production order not found': ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND,
  'Production sheet not found': ERROR_CODES.PRODUCTION_SHEET_NOT_FOUND,
  'Delivery sheet not found': ERROR_CODES.DELIVERY_SHEET_NOT_FOUND,
  'Production receipt not found': ERROR_CODES.PRODUCTION_RECEIPT_NOT_FOUND,
  'File not found': ERROR_CODES.FILE_NOT_FOUND,
  'Resource not found': ERROR_CODES.RESOURCE_NOT_FOUND,

  // Sistema
  'Database error': ERROR_CODES.DATABASE_ERROR,
  'External service error': ERROR_CODES.EXTERNAL_SERVICE_ERROR,
  'File upload error': ERROR_CODES.FILE_UPLOAD_ERROR,
  'Email send error': ERROR_CODES.EMAIL_SEND_ERROR,
  'Internal server error': ERROR_CODES.INTERNAL_SERVER_ERROR,
  'Service unavailable': ERROR_CODES.SERVICE_UNAVAILABLE,
  'Timeout error': ERROR_CODES.TIMEOUT_ERROR,
  'Network error': ERROR_CODES.NETWORK_ERROR,
  'Configuration error': ERROR_CODES.CONFIGURATION_ERROR,
  'Too many requests': ERROR_CODES.RATE_LIMIT_EXCEEDED
};

// Função para obter código de erro baseado na mensagem
function getErrorCode(message) {
  // Busca exata primeiro
  if (ERROR_MESSAGE_TO_CODE[message]) {
    return ERROR_MESSAGE_TO_CODE[message];
  }

  // Busca parcial para mensagens que podem variar
  for (const [key, code] of Object.entries(ERROR_MESSAGE_TO_CODE)) {
    if (message.includes(key)) {
      return code;
    }
  }

  // Códigos padrão baseados em palavras-chave
  if (message.includes('not found') || message.includes('not exist')) {
    return ERROR_CODES.RESOURCE_NOT_FOUND;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ERROR_CODES.VALIDATION_ERROR;
  }
  
  if (message.includes('permission') || message.includes('unauthorized')) {
    return ERROR_CODES.INSUFFICIENT_PERMISSIONS;
  }
  
  if (message.includes('duplicate') || message.includes('already exists')) {
    return ERROR_CODES.DUPLICATE_ENTRY;
  }
  
  if (message.includes('database') || message.includes('connection')) {
    return ERROR_CODES.DATABASE_ERROR;
  }

  // Código padrão para erros não mapeados
  return ERROR_CODES.INTERNAL_SERVER_ERROR;
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGE_TO_CODE,
  getErrorCode
};
