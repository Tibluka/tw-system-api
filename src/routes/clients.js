const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { validateCreateClient, validateUpdateClient } = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth'); // Assumindo que existe middleware de auth

// Aplicar autenticação em todas as rotas
router.use(authenticate);

// GET /api/v1/clients/stats - Estatísticas (deve vir antes de /:id)
router.get('/stats', clientController.stats);

// GET /api/v1/clients/search - Busca avançada (deve vir antes de /:id)
router.get('/search', clientController.search);

// GET /api/v1/clients - Listar todos os clientes
router.get('/', clientController.index);

// GET /api/v1/clients/:id - Buscar cliente por ID
router.get('/:id', clientController.show);

// POST /api/v1/clients - Criar novo cliente
router.post('/', validateCreateClient, clientController.store);

// PUT /api/v1/clients/:id - Atualizar cliente
router.put('/:id', validateUpdateClient, clientController.update);

// DELETE /api/v1/clients/:id - Desativar cliente (soft delete)
router.delete('/:id', clientController.destroy);

// POST /api/v1/clients/:id/activate - Reativar cliente
router.post('/:id/activate', clientController.activate);

module.exports = router;