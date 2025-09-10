const express = require('express');
const { authenticate, authorize, authorizeOwnership } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { validateRegister, validateUpdateUser } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/v1/users/stats
// @desc    Obter estatísticas de usuários
// @access  Private (admin only)
router.get('/stats', authenticate, authorize('admin'), userController.getUserStats);

// @route   GET /api/v1/users
// @desc    Listar todos os usuários (paginado)
// @access  Private (admin only)
router.get('/', authenticate, authorize('admin'), userController.getUsers);

// @route   POST /api/v1/users
// @desc    Criar novo usuário
// @access  Private (admin only)
router.post('/', authenticate, authorize('admin'), validateRegister, userController.createUser);

// @route   GET /api/v1/users/:id
// @desc    Obter usuário específico
// @access  Private (próprio usuário ou admin)
router.get('/:id', authenticate, authorizeOwnership, userController.getUserById);

// @route   PUT /api/v1/users/:id
// @desc    Atualizar usuário
// @access  Private (próprio usuário ou admin)
router.put('/:id', authenticate, authorizeOwnership, validateUpdateUser, userController.updateUser);

// @route   DELETE /api/v1/users/:id
// @desc    Deletar usuário (soft delete)
// @access  Private (admin only)
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

// @route   PATCH /api/v1/users/:id/reactivate
// @desc    Reativar usuário
// @access  Private (admin only)
router.patch('/:id/reactivate', authenticate, authorize('admin'), userController.reactivateUser);

// @route   PUT /api/v1/users/:id/password
// @desc    Alterar senha de usuário (admin)
// @access  Private (admin only)
router.put('/:id/password', authenticate, authorize('admin'), userController.changeUserPassword);

module.exports = router;