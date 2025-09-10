const Joi = require('joi');
const { AppError } = require('./errorHandler');

// Função para validar dados usando Joi
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // Mostrar todos os erros
      allowUnknown: true, // Permitir campos extras
      stripUnknown: true  // Remover campos extras
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError(`Dados inválidos: ${errors.map(e => e.message).join(', ')}`, 400));
    }

    next();
  };
};

// Schemas de validação
const schemas = {
  // Validação para registro de usuário
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.empty': 'Nome é obrigatório',
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome não pode ter mais de 50 caracteres'
      }),
    
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Email deve ter formato válido',
        'string.empty': 'Email é obrigatório'
      }),
    
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'string.max': 'Senha não pode ter mais de 128 caracteres',
        'string.pattern.base': 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
        'string.empty': 'Senha é obrigatória'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Confirmação de senha deve ser igual à senha',
        'string.empty': 'Confirmação de senha é obrigatória'
      })
  }),

  // Validação para login
  login: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Email deve ter formato válido',
        'string.empty': 'Email é obrigatório'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Senha é obrigatória'
      })
  }),

  // Validação para alterar senha
  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'string.empty': 'Senha atual é obrigatória'
      }),
    
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'Nova senha deve ter pelo menos 6 caracteres',
        'string.max': 'Nova senha não pode ter mais de 128 caracteres',
        'string.pattern.base': 'Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
        'string.empty': 'Nova senha é obrigatória'
      }),
    
    confirmNewPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Confirmação deve ser igual à nova senha',
        'string.empty': 'Confirmação da nova senha é obrigatória'
      })
  }),

  // Validação para atualizar usuário
  updateUser: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome não pode ter mais de 50 caracteres'
      }),
    
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Email deve ter formato válido'
      }),
    
    avatar: Joi.string()
      .uri()
      .messages({
        'string.uri': 'Avatar deve ser uma URL válida'
      })
  }),

  // Validação para esqueci senha
  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Email deve ter formato válido',
        'string.empty': 'Email é obrigatório'
      })
  }),

  // Validação para resetar senha
  resetPassword: Joi.object({
    password: Joi.string()
      .min(6)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'string.max': 'Senha não pode ter mais de 128 caracteres',
        'string.pattern.base': 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
        'string.empty': 'Senha é obrigatória'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Confirmação de senha deve ser igual à senha',
        'string.empty': 'Confirmação de senha é obrigatória'
      })
  })
};

// Middlewares de validação exportados
const validateRegister = validate(schemas.register);
const validateLogin = validate(schemas.login);
const validateChangePassword = validate(schemas.changePassword);
const validateUpdateUser = validate(schemas.updateUser);
const validateForgotPassword = validate(schemas.forgotPassword);
const validateResetPassword = validate(schemas.resetPassword);

// Validação de parâmetros da URL
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params);

    if (error) {
      return next(new AppError(`Parâmetro inválido: ${error.details[0].message}`, 400));
    }

    next();
  };
};

// Schema para validar ObjectId do MongoDB
const objectIdSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'ID deve ser um ObjectId válido',
      'string.empty': 'ID é obrigatório'
    })
});

const validateObjectId = validateParams(objectIdSchema);

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateUser,
  validateForgotPassword,
  validateResetPassword,
  validateObjectId,
  validateParams,
  schemas
};