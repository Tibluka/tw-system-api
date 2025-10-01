const { body } = require('express-validator');

// Validações para criação de cliente
const validateCreateClient = [
  body('acronym')
    .notEmpty()
    .withMessage('Acronym is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Acronym must be between 2 and 10 characters')
    .trim()
    .custom(async (value) => {
      const Client = require('../../models/Client');
      
      // Converter para uppercase para comparação
      const upperAcronym = value.toUpperCase();
      
      // Verificar se já existe no banco
      const existingClient = await Client.findOne({
        acronym: upperAcronym,
        active: true
      });
      
      if (existingClient) {
        throw new Error('Acronym already exists. Choose a different one.');
      }
      
      return true;
    }),

  body('companyName')
    .notEmpty()
    .withMessage('Razão social é obrigatória')
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .notEmpty()
    .withMessage('CNPJ é obrigatório')
    .custom(value => {
      if (!validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.responsibleName')
    .notEmpty()
    .withMessage('Responsible name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible name must be between 2 and 100 characters')
    .trim(),

  body('contact.phone')
    .notEmpty()
    .withMessage('Telefone é obrigatório')
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de phone inválido'),

  body('contact.email')
    .notEmpty()
    .withMessage('Email é obrigatório')
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('address.street')
    .notEmpty()
    .withMessage('Logradouro é obrigatório')
    .trim(),

  body('address.number')
    .notEmpty()
    .withMessage('Número é obrigatório')
    .trim(),

  body('address.complement').optional().trim(),

  body('address.neighborhood')
    .notEmpty()
    .withMessage('Bairro é obrigatório')
    .trim(),

  body('address.city')
    .notEmpty()
    .withMessage('Cidade é obrigatória')
    .trim(),

  body('address.state')
    .notEmpty()
    .withMessage('Estado é obrigatório')
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('address.zipcode')
    .notEmpty()
    .withMessage('CEP é obrigatório')
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('values.valuePerMeter')
    .notEmpty()
    .withMessage('Valor por metro é obrigatório')
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('active').optional().isBoolean().withMessage('Campo active deve ser verdadeiro ou falso')
];

// Validações para atualização de cliente
const validateUpdateClient = [
  body('acronym')
    .notEmpty()
    .withMessage('Acronym is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Acronym must be between 2 and 10 characters')
    .trim()
    .custom(async (value, { req }) => {
      const Client = require('../../models/Client');

      // Converter para uppercase para comparação
      const upperAcronym = value.toUpperCase();

      // Verificar se já existe no banco (exceto o próprio cliente sendo atualizado)
      const existingClient = await Client.findOne({
        acronym: upperAcronym,
        active: true,
        _id: { $ne: req.params.id } // Excluir o próprio cliente
      });

      if (existingClient) {
        throw new Error('Acronym already exists. Choose a different one.');
      }

      return true;
    }),

  body('companyName')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Razão social deve ter entre 2 e 200 caracteres')
    .trim(),

  body('cnpj')
    .optional()
    .custom(value => {
      if (value && !validateCNPJ(value)) {
        throw new Error('CNPJ inválido');
      }
      return true;
    }),

  body('contact.responsibleName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Responsible name must be between 2 and 100 characters')
    .trim(),

  body('contact.phone')
    .optional()
    .matches(/^[\d\s\(\)\-\+]+$/)
    .withMessage('Formato de phone inválido'),

  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Email deve ter formato válido')
    .normalizeEmail(),

  body('address.street').optional().notEmpty().withMessage('Logradouro não pode ser vazio').trim(),

  body('address.number').optional().notEmpty().withMessage('Número não pode ser vazio').trim(),

  body('address.complement').optional().trim(),

  body('address.neighborhood')
    .optional()
    .notEmpty()
    .withMessage('Bairro não pode ser vazio')
    .trim(),

  body('address.city').optional().notEmpty().withMessage('Cidade não pode ser vazia').trim(),

  body('address.state')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Estado deve ter 2 caracteres')
    .trim(),

  body('address.zipcode')
    .optional()
    .matches(/^\d{5}-?\d{3}$/)
    .withMessage('CEP deve ter formato válido (12345-678)'),

  body('values.valuePerMeter')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valor por metro deve ser um número positivo'),

  body('active').optional().isBoolean().withMessage('Campo active deve ser verdadeiro ou falso')
];

// Função auxiliar para validar CNPJ
function validateCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Validar primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cnpj[12]) !== digit1) return false;
  
  // Validar segundo dígito verificador
  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cnpj[13]) !== digit2) return false;
  
  return true;
}

module.exports = {
  validateCreateClient,
  validateUpdateClient
};
