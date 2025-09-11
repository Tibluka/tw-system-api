const ProductionOrder = require('../models/ProductionOrder');
const Development = require('../models/Development');
const { validationResult } = require('express-validator');

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
      
      // Filter by priority
      if (priority) {
        query.priority = priority;
      }
      
      // Filter by development
      if (developmentId) {
        query.developmentId = developmentId;
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { fabricType: { $regex: searchRegex, $options: 'i' } },
          { observations: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'fabricType', 'status', 'priority', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar production orders com paginação (development será populado automaticamente)
      const [productionOrders, totalCount] = await Promise.all([
        ProductionOrder.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .lean({ virtuals: true }), // Para incluir virtuals no lean
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
      console.error('Erro ao buscar production orders:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar production orders',
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
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        data: productionOrder
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production order',
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
          message: 'Invalid data',
          errors: errors.array()
        });
      }

      // Verify development exists and is approved
      const development = await Development.findById(req.body.developmentId);
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      if (development.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Development must be approved to create production order'
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
          message: 'Production order already exists for this development'
        });
      }

      const productionOrder = new ProductionOrder(req.body);
      await productionOrder.save();

      // Buscar novamente para incluir os dados do development (virtual populate)
      const productionOrderWithDevelopment = await ProductionOrder.findById(productionOrder._id);

      res.status(201).json({
        success: true,
        message: 'Production order created successfully',
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
          message: 'Invalid data',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating production order',
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
          message: 'Invalid data',
          errors: errors.array()
        });
      }

      // If developmentId is being updated, verify development exists and is approved
      if (req.body.developmentId) {
        const development = await Development.findById(req.body.developmentId);
        if (!development) {
          return res.status(404).json({
            success: false,
            message: 'Development not found'
          });
        }

        if (development.status !== 'APPROVED') {
          return res.status(400).json({
            success: false,
            message: 'Development must be approved'
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
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        message: 'Production order updated successfully',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating production order',
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
          message: 'Status is required'
        });
      }

      const validStatuses = ['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
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
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating status',
        error: error.message
      });
    }
  }

  // PATCH /production-orders/:id/priority - Update only priority
  async updatePriority(req, res) {
    try {
      const { id } = req.params;
      const { priority } = req.body;

      if (!priority) {
        return res.status(400).json({
          success: false,
          message: 'Priority is required'
        });
      }

      const validPriorities = ['green', 'yellow', 'red'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid priority'
        });
      }

      const productionOrder = await ProductionOrder.findByIdAndUpdate(
        id,
        { priority },
        { new: true, runValidators: true }
      );

      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        message: 'Priority updated successfully',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating priority',
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
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        message: 'Production order deactivated successfully',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error deactivating production order',
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
          message: 'Production order not found'
        });
      }

      res.json({
        success: true,
        message: 'Production order reactivated successfully',
        data: productionOrder
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error reactivating production order',
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
        message: 'Error fetching statistics',
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
          message: 'Production order not found for this development'
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
          message: 'Invalid development ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching production order',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionOrderController();