const { AppError } = require('./errorHandler');
const { ERROR_CODES } = require('../constants/errorCodes');
const ProductionOrder = require('../models/ProductionOrder');

// Mapeamento de endpoints por perfil
const ENDPOINT_PERMISSIONS = {
  DEFAULT: [
    '/api/v1/auth',
    '/api/v1/users',
    '/api/v1/clients',
    '/api/v1/developments',
    '/api/v1/production-orders',
    '/api/v1/production-sheets',
    '/api/v1/delivery-sheets',
    '/api/v1/health'
  ],
  PRINTING: [
    '/api/v1/auth',
    '/api/v1/production-sheets',
    '/api/v1/health'
  ],
  ADMIN: [
    // ADMIN tem acesso a tudo - não precisa de lista específica
  ],
  FINANCING: [
    '/api/v1/auth',
    '/api/v1/clients',
    '/api/v1/production-receipts',
    '/api/v1/health'
  ]
};

// Middleware para verificar permissões de endpoint
const checkEndpointPermission = (req, res, next) => {
  // Verificação de segurança para req.user
  if (!req.user) {
    return next(new AppError(
      'Usuário não autenticado.', 
      401,
      true,
      ERROR_CODES.AUTHENTICATION_REQUIRED
    ));
  }

  const userRole = req.user.role;
  const basePath = req.baseUrl + req.route.path;

  // ADMIN tem acesso total
  if (userRole === 'ADMIN') {
    return next();
  }

  // Verificar se o endpoint está permitido para o perfil
  const allowedEndpoints = ENDPOINT_PERMISSIONS[userRole] || [];
  const isAllowed = allowedEndpoints.some(endpoint => 
    basePath.startsWith(endpoint) || 
    req.originalUrl.startsWith(endpoint)
  );

  if (!isAllowed) {
    return next(new AppError(
      `Acesso negado. Seu perfil (${userRole}) não tem permissão para acessar este recurso.`, 
      403,
      true,
      ERROR_CODES.PROFILE_ACCESS_DENIED
    ));
  }

  next();
};

// Middleware específico para perfil PRINTING - restrições em production-sheets
const checkPrintingRestrictions = async (req, res, next) => {
  // Verificação de segurança para req.user
  if (!req.user) {
    return next(new AppError(
      'Usuário não autenticado.', 
      401,
      true,
      ERROR_CODES.AUTHENTICATION_REQUIRED
    ));
  }

  if (req.user.role !== 'PRINTING') {
    return next();
  }

  const method = req.method;
  const isUpdate = method === 'PUT' || method === 'PATCH';

  if (isUpdate && req.params.id) {
    try {
      // Buscar a ficha de produção atual
      const ProductionSheet = require('../models/ProductionSheet');
      const productionSheet = await ProductionSheet.findById(req.params.id);
      
      if (!productionSheet) {
        return next(new AppError('Ficha de produção não encontrada', 404));
      }

      // Verificar se a ordem de produção está com status PILOT_PRODUCTION
      const productionOrder = await ProductionOrder.findById(productionSheet.productionOrderId);
      
      if (!productionOrder) {
        return next(new AppError('Ordem de produção não encontrada', 404));
      }

      if (productionOrder.status !== 'PILOT_PRODUCTION') {
        return next(new AppError(
          'Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION', 
          403,
          true,
          ERROR_CODES.PRODUCTION_ORDER_STATUS_RESTRICTION
        ));
      }

      // Função para comparar valores considerando tipos de data
      const isValueChanged = (currentValue, newValue) => {
        // Se ambos são datas ou strings de data, comparar como datas
        if (isDateField(currentValue) || isDateField(newValue)) {
          const currentDate = parseToDate(currentValue);
          const newDate = parseToDate(newValue);
          
          if (currentDate && newDate) {
            return currentDate.getTime() !== newDate.getTime();
          }
        }
        
        // Para outros tipos, usar comparação JSON
        return JSON.stringify(currentValue) !== JSON.stringify(newValue);
      };

      // Função auxiliar para verificar se é um campo de data
      const isDateField = (value) => {
        return value instanceof Date || 
               (typeof value === 'string' && (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/)));
      };

      // Função auxiliar para converter para Date
      const parseToDate = (value) => {
        if (value instanceof Date) {
          return value;
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      };

      // Verificar quais campos realmente mudaram e filtrar req.body
      const allowedFields = ['stage', 'machine'];
      const changedFields = [];
      const forbiddenChangedFields = [];
      const filteredBody = {};

      // Comparar cada campo do payload com o valor atual
      for (const [field, newValue] of Object.entries(req.body)) {
        const currentValue = productionSheet[field];
        
        // Verificar se o valor realmente mudou (considerando datas)
        if (isValueChanged(currentValue, newValue)) {
          changedFields.push(field);
          
          // Verificar se o campo alterado é permitido para o perfil PRINTING
          if (!allowedFields.includes(field)) {
            forbiddenChangedFields.push(field);
          } else {
            // Adicionar apenas campos permitidos que mudaram ao filteredBody
            filteredBody[field] = newValue;
          }
        }
      }

      // Se há campos proibidos sendo alterados, bloquear
      if (forbiddenChangedFields.length > 0) {
        return next(new AppError(
          `Perfil PRINTING só pode alterar os campos: ${allowedFields.join(', ')}. Campos não permitidos sendo alterados: ${forbiddenChangedFields.join(', ')}`, 
          403,
          true,
          ERROR_CODES.FIELD_UPDATE_RESTRICTION
        ));
      }

      // Substituir req.body pelo filteredBody (apenas campos que mudaram e são permitidos)
      req.body = filteredBody;

      // Log para debug (opcional)
      if (changedFields.length > 0) {
        console.log(`Perfil PRINTING alterando campos: ${changedFields.join(', ')}`);
        console.log(`Body filtrado:`, filteredBody);
      }

    } catch (error) {
      return next(error);
    }
  }

  next();
};

// Middleware para verificar se usuário pode acessar recursos específicos
const checkResourceAccess = (resourceType) => {
  return (req, res, next) => {
    // Verificação de segurança para req.user
    if (!req.user) {
      return next(new AppError(
        'Usuário não autenticado.', 
        401,
        true,
        ERROR_CODES.AUTHENTICATION_REQUIRED
      ));
    }

    const userRole = req.user.role;

    // ADMIN tem acesso total
    if (userRole === 'ADMIN') {
      return next();
    }

    // Verificar acesso baseado no tipo de recurso
    switch (resourceType) {
      case 'production-receipts':
        if (userRole !== 'FINANCING') {
          return next(new AppError(
            'Acesso negado. Apenas perfis FINANCING podem acessar recibos de produção.', 
            403,
            true,
            ERROR_CODES.ENDPOINT_ACCESS_DENIED
          ));
        }
        break;

      case 'production-sheets':
        if (userRole !== 'PRINTING' && userRole !== 'DEFAULT') {
          return next(new AppError(
            'Acesso negado. Apenas perfis PRINTING e DEFAULT podem acessar fichas de produção.', 
            403,
            true,
            ERROR_CODES.ENDPOINT_ACCESS_DENIED
          ));
        }
        break;

      case 'clients':
        if (userRole !== 'FINANCING' && userRole !== 'DEFAULT') {
          return next(new AppError(
            'Acesso negado. Apenas perfis FINANCING e DEFAULT podem acessar clientes.', 
            403,
            true,
            ERROR_CODES.ENDPOINT_ACCESS_DENIED
          ));
        }
        break;

      default:
        // Para outros recursos, verificar se não é FINANCING (que tem acesso limitado)
        if (userRole === 'FINANCING') {
          return next(new AppError(
            'Acesso negado. Seu perfil tem acesso limitado a recursos específicos.', 
            403,
            true,
            ERROR_CODES.PROFILE_ACCESS_DENIED
          ));
        }
    }

    next();
  };
};

// Middleware para verificar permissões de criação/edição
const checkCreatePermission = (resourceType) => {
  return (req, res, next) => {
    // Verificação de segurança para req.user
    if (!req.user) {
      return next(new AppError(
        'Usuário não autenticado.', 
        401,
        true,
        ERROR_CODES.AUTHENTICATION_REQUIRED
      ));
    }

    const userRole = req.user.role;

    // ADMIN pode criar qualquer coisa
    if (userRole === 'ADMIN') {
      return next();
    }

    // Verificar permissões específicas por tipo de recurso
    switch (resourceType) {
      case 'production-sheets':
        if (userRole !== 'PRINTING' && userRole !== 'DEFAULT') {
          return next(new AppError(
            'Acesso negado. Apenas perfis PRINTING e DEFAULT podem criar fichas de produção.', 
            403,
            true,
            ERROR_CODES.RESOURCE_CREATION_DENIED
          ));
        }
        break;

      case 'production-receipts':
        if (userRole !== 'FINANCING') {
          return next(new AppError(
            'Acesso negado. Apenas perfis FINANCING podem criar recibos de produção.', 
            403,
            true,
            ERROR_CODES.RESOURCE_CREATION_DENIED
          ));
        }
        break;

      case 'users':
        if (userRole !== 'ADMIN') {
          return next(new AppError(
            'Acesso negado. Apenas administradores podem criar usuários.', 
            403,
            true,
            ERROR_CODES.RESOURCE_CREATION_DENIED
          ));
        }
        break;
    }

    next();
  };
};

module.exports = {
  checkEndpointPermission,
  checkPrintingRestrictions,
  checkResourceAccess,
  checkCreatePermission,
  ENDPOINT_PERMISSIONS
};
