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
        order = 'desc',
        sortOrder, // ✅ NOVO: Aceitar sortOrder também
        createdFrom, // ✅ NOVO: Filtro de data inicial
        createdTo    // ✅ NOVO: Filtro de data final
      } = req.query;

      // 🔍 DEBUG (remova depois)
      console.log('=== PRODUCTION RECEIPTS DEBUG ===');
      console.log('Query params:', req.query);

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

      // ✅ NOVO: Filtros por data de criação
      if (createdFrom || createdTo) {
        query.createdAt = {};
        
        if (createdFrom) {
          // Início do dia para createdFrom
          const fromDate = new Date(createdFrom);
          fromDate.setHours(0, 0, 0, 0);
          query.createdAt.$gte = fromDate;
          
          // 🔍 DEBUG (remova depois)
          console.log('createdFrom (parsed):', fromDate.toISOString());
        }
        
        if (createdTo) {
          // Fim do dia para createdTo
          const toDate = new Date(createdTo);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
          
          // 🔍 DEBUG (remova depois)
          console.log('createdTo (parsed):', toDate.toISOString());
        }
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { notes: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // 🔍 DEBUG (remova depois)
      console.log('Final MongoDB Query:', JSON.stringify(query, null, 2));

      // ✅ CORRIGIDO: Aceitar tanto 'order' quanto 'sortOrder'
      const finalOrder = sortOrder || order;
      const sortOrderValue = finalOrder === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'paymentStatus', 'paymentMethod', 'totalAmount', 'issueDate', 'dueDate', 'createdAt', 'updatedAt'].includes(sortBy) ? 
        sortBy : 'createdAt';

      // Execute query with pagination
      const [productionReceipts, totalCount] = await Promise.all([
        ProductionReceipt.find(query)
          .sort({ [sortField]: sortOrderValue })
          .skip(skip)
          .limit(limitNum)
          .populate('productionOrderId', 'internalReference developmentId fabricType')
          .lean(),
        ProductionReceipt.countDocuments(query)
      ]);

      // 🔍 DEBUG (remova depois)
      console.log('Results found:', totalCount);
      productionReceipts.forEach(receipt => {
        console.log(`${receipt.internalReference}: ${new Date(receipt.createdAt).toISOString()}`);
      });

      // Pagination info
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.json({
        success: true,
        data: productionReceipts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null
        }
      });
    } catch (error) {
      console.error('Error in productionReceipts.index:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching production receipts',
        error: error.message
      });
    }
  }

  // GET /production-receipts/stats - Get production receipt statistics
  async stats(req, res) {
    try {
      const statistics = await ProductionReceipt.getStatistics();

      res.json({
        success: true,
        data: statistics
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
      const existingReceipt = await ProductionReceipt.findOne({
        productionOrderId: req.body.productionOrderId,
        active: true
      });

      if (existingReceipt) {
        return res.status(400).json({
          success: false,
          message: 'Production receipt already exists for this production order'
        });
      }

      const productionReceipt = new ProductionReceipt(req.body);
      await productionReceipt.save();

      res.status(201).json({
        success: true,
        message: 'Production receipt created successfully',
        data: productionReceipt
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
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

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        req.body,
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
        message: 'Production receipt updated successfully',
        data: productionReceipt
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts/:id/process-payment - Process payment for production receipt
  async processPayment(req, res) {
    try {
      const { id } = req.params;
      const { paidAmount, paymentDate } = req.body;
      
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: errors.array()
        });
      }

      const productionReceipt = await ProductionReceipt.findById(id);
      
      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      // Update payment data
      productionReceipt.paidAmount += paidAmount;
      productionReceipt.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      
      // Check if fully paid
      if (productionReceipt.paidAmount >= productionReceipt.totalAmount) {
        productionReceipt.paymentStatus = 'PAID';
        productionReceipt.paidAmount = productionReceipt.totalAmount; // Ensure it doesn't exceed
      }

      await productionReceipt.save();

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: productionReceipt
      });
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message
          }))
        });
      }

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

  // PATCH /production-receipts/:id/payment-status - Update only production receipt payment status
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { paymentStatus, paymentDate } = req.body;
      
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors: errors.array()
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
}

module.exports = new ProductionReceiptController();