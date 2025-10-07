const express = require('express');
const { authenticate, authorize, authorizeOwnership } = require('../middleware/auth');
const { checkEndpointPermission, checkCreatePermission } = require('../middleware/permissions');
const userController = require('../controllers/userController');
const { validateUpdateUser, validateCreateUser } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/v1/users/stats
// @desc    Obter estatísticas de usuários
// @access  Private (admin only)
router.get('/stats', authenticate, authorize('ADMIN'), checkEndpointPermission, userController.getUserStats);

// @route   GET /api/v1/users
// @desc    Listar todos os usuários (paginado)
// @access  Private (admin only)
router.get('/', authenticate, authorize('ADMIN'), checkEndpointPermission, userController.getUsers);

// OPÇÃO 2: Criar usuário COM autenticação (admin only)
// @route   POST /api/v1/users
// @desc    Criar novo usuário (admin apenas)
// @access  Private (admin only)
router.post('/', authenticate, authorize('ADMIN'), checkCreatePermission('users'), validateCreateUser, userController.createUser);

// @route   GET /api/v1/users/:id
// @desc    Obter usuário específico
// @access  Private (próprio usuário ou admin)
router.get('/:id', authenticate, authorizeOwnership, checkEndpointPermission, userController.getUserById);

// @route   PUT /api/v1/users/:id
// @desc    Atualizar usuário
// @access  Private (próprio usuário ou admin)
router.put('/:id', authenticate, authorizeOwnership, checkEndpointPermission, validateUpdateUser, userController.updateUser);

// @route   DELETE /api/v1/users/:id
// @desc    Deletar usuário (soft delete)
// @access  Private (admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), checkEndpointPermission, userController.deleteUser);

// @route   PATCH /api/v1/users/:id/reactivate
// @desc    Reativar usuário
// @access  Private (admin only)
router.patch('/:id/reactivate', authenticate, authorize('ADMIN'), checkEndpointPermission, userController.reactivateUser);

// @route   PUT /api/v1/users/:id/password
// @desc    Alterar senha de usuário (admin)
// @access  Private (admin only)
router.put('/:id/password', authenticate, authorize('ADMIN'), checkEndpointPermission, userController.changeUserPassword);

module.exports = router;