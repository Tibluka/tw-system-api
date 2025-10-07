const ProductionOrder = require('../models/ProductionOrder');
const Development = require('../models/Development');
const { validationResult } = require('express-validator');
const { ERROR_CODES } = require('../constants/errorCodes');

class ProductionOrderController {
  // GET /production-orders - List all production orders
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status,
        priority,
        developmentId,
        active,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // SEMPRE filtrar apenas production orders ativos por padrão
      const query = { active: true };
      
      // Permitir buscar inativos apenas se explicitamente solicitado
      if (active === 'false') {
        query.active = false;
      } else if (active === 'all') {
        delete query.active; // Remove o filtro para mostrar todos
      }
      
      // Filter by status
      if (status) {
        query.status = status;
      }
   
      // Filter by development
      if (developmentId) {
        query.developmentId = developmentId;
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        
        // Buscar developments que correspondem ao termo de busca
        const Development = require('../models/Development');
        const Client = require('../models/Client');
        
        // Primeiro, buscar clientes que correspondem ao termo de busca
        const matchingClients = await Client.find({
          $or: [
            { companyName: { $regex: searchRegex, $options: 'i' } },
            { acronym: { $regex: searchRegex, $options: 'i' } }
          ]
        }).select('_id');
        
        const clientIds = matchingClients.map(client => client._id);
        
        // Depois, buscar developments que correspondem ao termo OU que referenciam os clientes encontrados
        const matchingDevelopments = await Development.find({
          $or: [
            { description: { $regex: searchRegex, $options: 'i' } },
            { clientReference: { $regex: searchRegex, $options: 'i' } },
            ...(clientIds.length > 0 ? [{ clientId: { $in: clientIds } }] : [])
          ]
        }).select('_id');
        
        const developmentIds = matchingDevelopments.map(dev => dev._id);
        
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { observations: { $regex: searchRegex, $options: 'i' } },
          { 'productionType.type': { $regex: searchRegex, $options: 'i' } },
          { 'productionType.fabricType': { $regex: searchRegex, $options: 'i' } }
        ];
        
        // Se encontrou developments correspondentes, incluir na busca
        if (developmentIds.length > 0) {
          query.$or.push({ developmentId: { $in: developmentIds } });
        }
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'fabricType', 'status', 'priority', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar production orders com paginação (development será populado automaticamente)
      const [productionOrders, totalCount] = await Promise.all([
        ProductionOrder.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum),
        ProductionOrder.countDocuments(query)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: productionOrders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNext,
          hasPrev,
          nextPage: hasNext ? pageNum + 1 : null,
          prevPage: hasPrev ? pageNum - 1 : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar ordens de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /production-orders/:id - Get production order by ID or internalReference
  async show(req, res) {
    try {
      const { id } = req.params;
      let productionOrder = null;

      // Tentar buscar por MongoDB ObjectId primeiro (apenas ativos)
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        productionOrder = await ProductionOrder.findOne({ _id: id, active: true });
      }
      
      // Se não encontrou, tentar por internalReference (apenas ativos)
      if (!productionOrder) {
        productionOrder = await ProductionOrder.findOne({ 
          internalReference: id.toUpperCase(),
          active: true 
        });
      }

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada',
          code: ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND
        });
      }

      res.json({
        success: true,
        data: productionOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // POST /production-orders - Create new production order
  async store(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          code: ERROR_CODES.INVALID_DATA,
          errors: errors.array()
        });
      }

      // Verify development exists and is approved
      const development = await Development.findById(req.body.developmentId);
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Desenvolvimento não encontrado',
          code: ERROR_CODES.DEVELOPMENT_NOT_FOUND
        });
      }

      if (development.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Desenvolvimento deve estar aprovado para criar ordem de produção',
          code: ERROR_CODES.DEVELOPMENT_NOT_APPROVED
        });
      }

      // Check if production order already exists for this development
      const existingProductionOrder = await ProductionOrder.findOne({ 
        developmentId: req.body.developmentId,
        active: true 
      });
      
      if (existingProductionOrder) {
        return res.status(409).json({
          success: false,
          message: 'Ordem de produção já existe para este desenvolvimento',
          code: ERROR_CODES.PRODUCTION_ORDER_ALREADY_EXISTS
        });
      }

      const productionOrder = new ProductionOrder(req.body);
      await productionOrder.save();

      // Buscar novamente para incluir os dados do development (virtual populate)
      const productionOrderWithDevelopment = await ProductionOrder.findById(productionOrder._id);

      res.status(201).json({
        success: true,
        message: 'Ordem de produção criada com sucesso',
        data: productionOrderWithDevelopment
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao criar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // PUT /production-orders/:id - Update production order
  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          code: ERROR_CODES.INVALID_DATA,
          errors: errors.array()
        });
      }

      // If developmentId is being updated, verify development exists and is approved
      if (req.body.developmentId) {
        const development = await Development.findById(req.body.developmentId);
        if (!development) {
          return res.status(404).json({
            success: false,
            message: 'Desenvolvimento não encontrado',
          code: ERROR_CODES.DEVELOPMENT_NOT_FOUND
          });
        }

        if (development.status !== 'APPROVED') {
          return res.status(400).json({
            success: false,
            message: 'Desenvolvimento deve estar aprovado',
            code: ERROR_CODES.DEVELOPMENT_NOT_APPROVED
          });
        }
      }

      const productionOrder = await ProductionOrder.findByIdAndUpdate(
        id,
        req.body,
        { 
          new: true, 
          runValidators: true 
        }
      );

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada',
          code: ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND
        });
      }

      res.json({
        success: true,
        message: 'Ordem de produção atualizada com sucesso',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // PATCH /production-orders/:id/status - Update only status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status é obrigatório'
        });
      }

      const validStatuses = ['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status inválido'
        });
      }

      const productionOrder = await ProductionOrder.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada',
          code: ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND
        });
      }

      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar status',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // DELETE /production-orders/:id - Deactivate production order (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const productionOrder = await ProductionOrder.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada',
          code: ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND
        });
      }

      res.json({
        success: true,
        message: 'Ordem de produção desativada com sucesso',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao desativar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // POST /production-orders/:id/activate - Reactivate production order
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      const productionOrder = await ProductionOrder.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      );

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada',
          code: ERROR_CODES.PRODUCTION_ORDER_NOT_FOUND
        });
      }

      res.json({
        success: true,
        message: 'Ordem de produção reativada com sucesso',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao reativar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // GET /production-orders/stats - Production order statistics
  async stats(req, res) {
    try {
      const stats = await ProductionOrder.getStatistics();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }

  // GET /production-orders/by-development/:developmentId - Get production order by development
  async getByDevelopment(req, res) {
    try {
      const { developmentId } = req.params;

      const productionOrder = await ProductionOrder.getByDevelopment(developmentId);

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Ordem de produção não encontrada para este desenvolvimento'
        });
      }

      res.json({
        success: true,
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID de desenvolvimento inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar ordem de produção',
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        error: error.message
      });
    }
  }
}

module.exports = new ProductionOrderController();