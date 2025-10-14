const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');
const { AppError } = require('../middleware/errorHandler');
const { ERROR_CODES } = require('../constants/errorCodes');

const router = express.Router();

// Função para gerar senha aleatória de 6 caracteres
function generateRandomPassword(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return password;
}

// @route   POST /api/v1/admin/update-passwords
// @desc    Atualizar senhas de usuários específicos (SEM AUTENTICAÇÃO)
// @access  Public (temporário)
router.post('/update-passwords', async (req, res, next) => {
  try {
    console.log('🔧 Iniciando atualização de senhas...');

    // Lista de usuários para atualizar
    const usersToUpdate = [
      'validacao.desenvolvimento@twestamparia.com.br',
      'validacao.pcp@twestamparia.com.br', 
      'validacao.recibos@twestamparia.com.br'
    ];

    const updatedUsers = [];
    const errors = [];

    for (const email of usersToUpdate) {
      try {
        console.log(`🔍 Processando usuário: ${email}`);

        // Buscar o usuário
        const user = await User.findOne({ email });
        
        if (!user) {
          console.log(`❌ Usuário não encontrado: ${email}`);
          errors.push(`Usuário não encontrado: ${email}`);
          continue;
        }

        // Gerar nova senha
        const newPassword = generateRandomPassword(6);
        console.log(`🔑 Nova senha gerada para ${email}: ${newPassword}`);
        
        // Atualizar a senha (o middleware pre('save') fará o hash automaticamente)
        user.password = newPassword;
        user.passwordChangedAt = new Date();
        
        await user.save();

        updatedUsers.push({
          email: email,
          password: newPassword,
          role: user.role,
          name: user.name
        });

        console.log(`✅ Senha atualizada para: ${email}`);

      } catch (error) {
        console.log(`❌ Erro ao atualizar usuário ${email}:`, error.message);
        errors.push(`Erro ao atualizar ${email}: ${error.message}`);
      }
    }

    console.log(`📊 Processo concluído. ${updatedUsers.length} usuários atualizados.`);

    res.status(200).json({
      success: true,
      message: 'Senhas atualizadas com sucesso',
      data: {
        updatedUsers: updatedUsers,
        errors: errors,
        totalUpdated: updatedUsers.length,
        totalErrors: errors.length
      }
    });

  } catch (error) {
    console.error('❌ Erro no processo:', error);
    return next(new AppError(
      'Erro interno do servidor ao atualizar senhas',
      500,
      true,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
});

// @route   POST /api/v1/admin/check-user
// @desc    Verificar informações de um usuário específico
// @access  Public (temporário)
router.post('/check-user', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new AppError(
        'Email é obrigatório',
        400,
        true,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      ));
    }

    const user = await User.findOne({ email }).select('name email role isActive passwordChangedAt createdAt');

    if (!user) {
      return next(new AppError(
        'Usuário não encontrado',
        404,
        true,
        ERROR_CODES.USER_NOT_FOUND
      ));
    }

    res.status(200).json({
      success: true,
      message: 'Usuário encontrado',
      data: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        hasPassword: !!user.password,
        passwordChangedAt: user.passwordChangedAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    return next(new AppError(
      'Erro interno do servidor',
      500,
      true,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
});

// @route   POST /api/v1/admin/update-user-password
// @desc    Atualizar senha de um usuário específico
// @access  Public (temporário)
router.post('/update-user-password', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    console.log('🔧 Atualizando senha do usuário:', email);

    // Validações
    if (!email) {
      return next(new AppError(
        'Email é obrigatório',
        400,
        true,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      ));
    }

    if (!password) {
      return next(new AppError(
        'Senha é obrigatória',
        400,
        true,
        ERROR_CODES.MISSING_REQUIRED_FIELD
      ));
    }

    if (password.length < 6) {
      return next(new AppError(
        'Senha deve ter pelo menos 6 caracteres',
        400,
        true,
        ERROR_CODES.INVALID_PASSWORD_FORMAT
      ));
    }

    // Buscar o usuário
    const user = await User.findOne({ email });
    
    if (!user) {
      return next(new AppError(
        'Usuário não encontrado',
        404,
        true,
        ERROR_CODES.USER_NOT_FOUND
      ));
    }

    console.log(`👤 Usuário encontrado: ${user.name} (${user.role})`);
    console.log(`🔑 Atualizando senha...`);

    // Hash da senha
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Atualizar a senha
    user.password = hashedPassword;
    console.log(hashedPassword);
    
    await user.save();

    console.log(`✅ Senha atualizada com sucesso para: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Senha atualizada com sucesso',
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordChangedAt: user.passwordChangedAt
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar senha:', error);
    return next(new AppError(
      'Erro interno do servidor ao atualizar senha',
      500,
      true,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    ));
  }
});

module.exports = router;
