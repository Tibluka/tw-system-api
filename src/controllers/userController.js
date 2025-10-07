const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES } = require('../constants/errorCodes');
const logger = require('../utils/logger');
const { generateStrongPassword } = require('../middleware/validation'); // Mudança aqui

// @desc    Listar todos os usuários (paginado)
// @route   GET /api/v1/users
// @access  Private (admin only)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtros opcionais
    const filters = {};
    if (req.query.isActive !== undefined) {
      filters.isActive = req.query.isActive === 'true';
    }
    if (req.query.role) {
      filters.role = req.query.role;
    }
    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Buscar usuários com paginação
    const users = await User.find(filters)
      .select('-password -passwordResetToken -emailVerificationToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Total de documentos para paginação
    const totalUsers = await User.countDocuments(filters);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

    logger.info(`Lista de usuários acessada por admin: ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Obter usuário específico
// @route   GET /api/v1/users/:id
// @access  Private (próprio usuário ou admin)
const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return next(new AppError('Usuário não encontrado', 404, true, ERROR_CODES.USER_NOT_FOUND));
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

    logger.info(`Usuário ${userId} acessado por: ${req.user.email}`);
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('ID de usuário inválido', 400, true, ERROR_CODES.INVALID_OBJECT_ID));
    }
    next(error);
  }
};

// @desc    Criar novo usuário
// @route   POST /api/v1/users
// @access  Private (admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;

    // Verificar se o usuário já existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('Email já está em uso', 400, true, ERROR_CODES.DUPLICATE_ENTRY));
    }

    const password = generateStrongPassword();

    // Criar novo usuário
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      data: {
        user: user.toJSON(),
        senhaGerada: password // Retorna a senha gerada para o admin
      }
    });

    logger.info(`Novo usuário criado por admin ${req.user.email}: ${email}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Atualizar usuário
// @route   PUT /api/v1/users/:id
// @access  Private (próprio usuário ou admin)
const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Campos que não podem ser atualizados por esta rota
    const forbiddenFields = ['password', 'email', 'passwordResetToken', 'emailVerificationToken'];
    forbiddenFields.forEach(field => delete updates[field]);

    // Apenas admin pode alterar role e isActive
    if (req.user.role !== 'ADMIN') {
      delete updates.role;
      delete updates.isActive;
    }

    // Verificar se email não está em uso por outro usuário
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email.toLowerCase(),
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return next(new AppError('Email já está em uso por outro usuário', 400, true, ERROR_CODES.DUPLICATE_ENTRY));
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return next(new AppError('Usuário não encontrado', 404, true, ERROR_CODES.USER_NOT_FOUND));
    }

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: {
        user: user.toJSON()
      }
    });

    logger.info(`Usuário ${userId} atualizado por: ${req.user.email}`);
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('ID de usuário inválido', 400, true, ERROR_CODES.INVALID_OBJECT_ID));
    }
    next(error);
  }
};

// @desc    Deletar usuário (soft delete)
// @route   DELETE /api/v1/users/:id
// @access  Private (admin only)
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Não permitir que admin delete a si mesmo
    if (req.user.id === userId) {
      return next(new AppError('Você não pode deletar sua própria conta', 400));
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return next(new AppError('Usuário não encontrado', 404, true, ERROR_CODES.USER_NOT_FOUND));
    }

    // Soft delete - apenas desativar a conta
    await User.findByIdAndUpdate(userId, { 
      isActive: false,
      deletedAt: new Date(),
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });

    logger.info(`Usuário ${userId} (${user.email}) deletado por admin: ${req.user.email}`);
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('ID de usuário inválido', 400, true, ERROR_CODES.INVALID_OBJECT_ID));
    }
    next(error);
  }
};

// @desc    Reativar usuário
// @route   PATCH /api/v1/users/:id/reactivate
// @access  Private (admin only)
const reactivateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: true,
        $unset: { deletedAt: 1, deletedBy: 1 }
      },
      { new: true }
    ).select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      return next(new AppError('Usuário não encontrado', 404, true, ERROR_CODES.USER_NOT_FOUND));
    }

    res.json({
      success: true,
      message: 'Usuário reativado com sucesso',
      data: {
        user: user.toJSON()
      }
    });

    logger.info(`Usuário ${userId} reativado por admin: ${req.user.email}`);
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('ID de usuário inválido', 400, true, ERROR_CODES.INVALID_OBJECT_ID));
    }
    next(error);
  }
};

// @desc    Alterar senha de usuário (admin)
// @route   PUT /api/v1/users/:id/password
// @access  Private (admin only)
const changeUserPassword = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return next(new AppError('Nova senha deve ter pelo menos 6 caracteres', 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('Usuário não encontrado', 404, true, ERROR_CODES.USER_NOT_FOUND));
    }

    // Atualizar senha (será hasheada automaticamente pelo middleware do modelo)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

    logger.info(`Senha do usuário ${userId} alterada por admin: ${req.user.email}`);
  } catch (error) {
    if (error.name === 'CastError') {
      return next(new AppError('ID de usuário inválido', 400, true, ERROR_CODES.INVALID_OBJECT_ID));
    }
    next(error);
  }
};

// @desc    Obter estatísticas de usuários
// @route   GET /api/v1/users/stats
// @access  Private (admin only)
const getUserStats = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          verifiedEmails: {
            $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'ADMIN'] }, 1, 0] }
          },
          defaultUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'DEFAULT'] }, 1, 0] }
          },
          printingUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'PRINTING'] }, 1, 0] }
          },
          financingUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'FINANCING'] }, 1, 0] }
          }
        }
      }
    ]);

    // Usuários criados nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      data: {
        ...stats[0],
        recentUsers: recentUsers
      }
    });

    logger.info(`Estatísticas de usuários acessadas por admin: ${req.user.email}`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  changeUserPassword,
  getUserStats
};