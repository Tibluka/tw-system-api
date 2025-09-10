// Validações básicas (sem Joi por enquanto)

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email e senha são obrigatórios'
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }
  
  next();
};

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e senha são obrigatórios'
    });
  }
  
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter entre 2 e 50 caracteres'
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Senha deve ter pelo menos 6 caracteres'
    });
  }
  
  next();
};

const validateCreateUser = (req, res, next) => {
  const { name, email, role } = req.body;
  
  if (!name || !email || !role) {
    return res.status(400).json({
      success: false,
      message: 'Nome, email e função são obrigatórios'
    });
  }
  
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Nome deve ter entre 2 e 50 caracteres'
    });
  }
  
  if (!isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Email inválido'
    });
  }
  
  next();
};

const validateUpdateUser = (req, res, next) => {
  const { name, email, role } = req.body;
  
  // Validar nome se fornecido
  if (name !== undefined) {
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Nome deve ter entre 2 e 50 caracteres'
      });
    }
  }
  
  // Validar email se fornecido
  if (email !== undefined) {
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }
  }
  
  // Validar role se fornecido
  if (role !== undefined) {
    const validRoles = ['user', 'ADMIN', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role deve ser: user, admin ou moderator'
      });
    }
  }
  
  next();
};

const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Senha atual e nova senha são obrigatórias'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ter pelo menos 6 caracteres'
    });
  }
  
  if (currentPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ser diferente da atual'
    });
  }
  
  next();
};

const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  
  // Validação básica de ObjectId do MongoDB (24 caracteres hexadecimais)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  
  if (!objectIdRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }
  
  next();
};

const validatePasswordChange = (req, res, next) => {
  const { newPassword } = req.body;
  
  if (!newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha é obrigatória'
    });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Nova senha deve ter pelo menos 6 caracteres'
    });
  }
  
  next();
};

// Função auxiliar para validar email
const isValidEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Middleware para validar query parameters de paginação
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;
  
  if (page && (isNaN(page) || parseInt(page) < 1)) {
    return res.status(400).json({
      success: false,
      message: 'Página deve ser um número maior que 0'
    });
  }
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limite deve ser um número entre 1 e 100'
    });
  }
  
  next();
};

const generateStrongPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '!@#$%&*()=';
  let password = '';
  // Garantir pelo menos um de cada
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  // Preencher o restante aleatoriamente
  const all = upper + lower + numbers + specials;
  for (let i = 4; i < 6; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  // Embaralhar para não ficar previsível
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}


module.exports = {
  validateLogin,
  validateRegister,
  validateUpdateUser,
  validateChangePassword,
  validateObjectId,
  validatePasswordChange,
  validatePagination,
  generateStrongPassword,
  validateCreateUser
};
