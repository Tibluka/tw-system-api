const ProductionReceipt = require('../models/ProductionReceipt');
const ProductionOrder = require('../models/ProductionOrder');
const { validationResult } = require('express-validator');

class ProductionReceiptController {
  // GET /production-receipts - List all production receipts
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        paymentStatus,
        paymentMethod,
        productionOrderId,
        overdue,
        active,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // SEMPRE filtrar apenas production receipts ativos por padrão
      const query = { active: true };
      
      // Permitir buscar inativos apenas se explicitamente solicitado
      if (active === 'false') {
        query.active = false;
      } else if (active === 'all') {
        delete query.active; // Remove o filtro para mostrar todos
      }
      
      // Filter by payment status
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      // Filter by payment method
      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }
      
      // Filter by production order
      if (productionOrderId) {
        query.productionOrderId = productionOrderId;
      }
      
      // Filter by overdue
      if (overdue === 'true') {
        query.paymentStatus = 'PENDING';
        query.dueDate = { $lt: new Date() };
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { notes: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'paymentStatus', 'paymentMethod', 'totalAmount', 'issueDate', 'dueDate', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar production receipts com paginação (production order será populado automaticamente)
      const [productionReceipts, totalCount] = await Promise.all([
        ProductionReceipt.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .lean({ virtuals: true }), // Para incluir virtuals no lean
        ProductionReceipt.countDocuments(query)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: productionReceipts,
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
      console.error('Erro ao buscar production receipts:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar production receipts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /production-receipts/:id - Get production receipt by ID or internalReference
  async show(req, res) {
    try {
      const { id } = req.params;
      let productionReceipt = null;

      // Tentar buscar por MongoDB ObjectId primeiro (apenas ativos)
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        productionReceipt = await ProductionReceipt.findOne({ _id: id, active: true });
      }
      
      // Se não encontrou, tentar por internalReference (apenas ativos)
      if (!productionReceipt) {
        productionReceipt = await ProductionReceipt.findOne({ 
          internalReference: id.toUpperCase(),
          active: true 
        });
      }

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        data: productionReceipt
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts - Create new production receipt
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

      // Verify production order exists and is finalized
      const productionOrder = await ProductionOrder.findById(req.body.productionOrderId);
      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Production order not found'
        });
      }

      if (productionOrder.status !== 'FINALIZED') {
        return res.status(400).json({
          success: false,
          message: 'Production order must be finalized to create production receipt'
        });
      }

      // Check if production receipt already exists for this production order
      const existingProductionReceipt = await ProductionReceipt.findOne({ 
        productionOrderId: req.body.productionOrderId,
        active: true 
      });
      
      if (existingProductionReceipt) {
        return res.status(409).json({
          success: false,
          message: 'Production receipt already exists for this production order'
        });
      }

      const productionReceipt = new ProductionReceipt(req.body);
      await productionReceipt.save();

      // Buscar novamente para incluir os dados da production order (virtual populate)
      const productionReceiptWithData = await ProductionReceipt.findById(productionReceipt._id);

      res.status(201).json({
        success: true,
        message: 'Production receipt created successfully',
        data: productionReceiptWithData
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
        message: 'Error creating production receipt',
        error: error.message
      });
    }
  }

  // PUT /production-receipts/:id - Update production receipt
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

      // If productionOrderId is being updated, verify production order exists
      if (req.body.productionOrderId) {
        const productionOrder = await ProductionOrder.findById(req.body.productionOrderId);
        if (!productionOrder) {
          return res.status(404).json({
            success: false,
            message: 'Production order not found'
          });
        }

        if (productionOrder.status !== 'FINALIZED') {
          return res.status(400).json({
            success: false,
            message: 'Production order must be finalized'
          });
        }
      }

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        req.body,
        { 
          new: true, 
          runValidators: true 
        }
      );

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        message: 'Production receipt updated successfully',
        data: productionReceipt
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
        message: 'Error updating production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts/:id/process-payment - Process payment
  async processPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount, paymentDate } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount must be greater than 0'
        });
      }

      const productionReceipt = await ProductionReceipt.findById(id);
      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      try {
        productionReceipt.processPayment(amount, paymentDate ? new Date(paymentDate) : new Date());
        await productionReceipt.save();

        res.json({
          success: true,
          message: 'Payment processed successfully',
          data: productionReceipt
        });
      } catch (paymentError) {
        return res.status(400).json({
          success: false,
          message: paymentError.message
        });
      }
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error processing payment',
        error: error.message
      });
    }
  }

  // PATCH /production-receipts/:id/payment-status - Update only payment status
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentDate } = req.body;

      if (!paymentStatus) {
        return res.status(400).json({
          success: false,
          message: 'Payment status is required'
        });
      }

      const validStatuses = ['PENDING', 'PAID'];
      if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status'
        });
      }

      const updateData = { paymentStatus };
      
      // Se está marcando como PAID, definir data de pagamento
      if (paymentStatus === 'PAID') {
        updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      } else {
        // Se está voltando para PENDING, remover data de pagamento
        updateData.paymentDate = undefined;
      }

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: productionReceipt
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
        message: 'Error updating payment status',
        error: error.message
      });
    }
  }

  // DELETE /production-receipts/:id - Deactivate production receipt (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        message: 'Production receipt deactivated successfully',
        data: productionReceipt
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
        message: 'Error deactivating production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts/:id/activate - Reactivate production receipt
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      );

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        message: 'Production receipt reactivated successfully',
        data: productionReceipt
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
        message: 'Error reactivating production receipt',
        error: error.message
      });
    }
  }

  // GET /production-receipts/stats - Production receipt statistics
  async stats(req, res) {
    try {
      const stats = await ProductionReceipt.getStatistics();
      
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

  // GET /production-receipts/by-production-order/:productionOrderId - Get production receipt by production order
  async getByProductionOrder(req, res) {
    try {
      const { productionOrderId } = req.params;

      const productionReceipt = await ProductionReceipt.getByProductionOrder(productionOrderId);

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found for this production order'
        });
      }

      res.json({
        success: true,
        data: productionReceipt
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production order ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching production receipt',
        error: error.message
      });
    }
  }

  // GET /production-receipts/overdue - Get overdue production receipts
  async getOverdue(req, res) {
    try {
      const overdueReceipts = await ProductionReceipt.find({
        active: true,
        paymentStatus: 'PENDING',
        dueDate: { $lt: new Date() }
      }).sort({ dueDate: 1 });

      res.json({
        success: true,
        data: overdueReceipts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching overdue receipts',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionReceiptController();