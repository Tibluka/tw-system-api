const ProductionSheet = require('../models/ProductionSheet');
const ProductionOrder = require('../models/ProductionOrder');
const { validationResult } = require('express-validator');

class ProductionSheetController {
  // GET /production-sheets - List all production sheets
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        stage,
        machine,
        productionOrderId,
        active,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // SEMPRE filtrar apenas production sheets ativos por padrão
      const query = { active: true };
      
      // Permitir buscar inativos apenas se explicitamente solicitado
      if (active === 'false') {
        query.active = false;
      } else if (active === 'all') {
        delete query.active; // Remove o filtro para mostrar todos
      }
      
      // Filter by stage
      if (stage) {
        query.stage = stage;
      }
      
      // Filter by machine
      if (machine) {
        query.machine = parseInt(machine);
      }
      
      // Filter by production order
      if (productionOrderId) {
        query.productionOrderId = productionOrderId;
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { productionNotes: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'stage', 'machine', 'entryDate', 'expectedExitDate', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar production sheets com paginação (production order será populado automaticamente)
      const [productionSheets, totalCount] = await Promise.all([
        ProductionSheet.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .lean({ virtuals: true }), // Para incluir virtuals no lean
        ProductionSheet.countDocuments(query)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: productionSheets,
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
        message: 'Erro interno do servidor ao buscar production sheets',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /production-sheets/:id - Get production sheet by ID or internalReference
  async show(req, res) {
    try {
      const { id } = req.params;
      let productionSheet = null;

      // Tentar buscar por MongoDB ObjectId primeiro (apenas ativos)
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        productionSheet = await ProductionSheet.findOne({ _id: id, active: true });
      }
      
      // Se não encontrou, tentar por internalReference (apenas ativos)
      if (!productionSheet) {
        productionSheet = await ProductionSheet.findOne({ 
          internalReference: id.toUpperCase(),
          active: true 
        });
      }

      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      res.json({
        success: true,
        data: productionSheet
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production sheet',
        error: error.message
      });
    }
  }

  // POST /production-sheets - Create new production sheet
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

      // Verify production order exists and is in appropriate status
      const productionOrder = await ProductionOrder.findById(req.body.productionOrderId);
      if (!productionOrder) {
        return res.status(404).json({
          success: false,
          message: 'Production order not found'
        });
      }
      // Check if production sheet already exists for this production order
      const existingProductionSheet = await ProductionSheet.findOne({ 
        productionOrderId: req.body.productionOrderId,
        active: true 
      });
      
      if (existingProductionSheet) {
        return res.status(409).json({
          success: false,
          message: 'Production sheet already exists for this production order'
        });
      }

      const productionSheet = new ProductionSheet(req.body);
      await productionSheet.save();

      // Buscar novamente para incluir os dados da production order (virtual populate)
      const productionSheetWithData = await ProductionSheet.findById(productionSheet._id);

      res.status(201).json({
        success: true,
        message: 'Production sheet created successfully',
        data: productionSheetWithData
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
        message: 'Error creating production sheet',
        error: error.message
      });
    }
  }

  // PUT /production-sheets/:id - Update production sheet
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
      }

      // ✅ CORRIGIDO: Usar findById + save para garantir que os campos sejam atualizados
      const productionSheet = await ProductionSheet.findById(id);
      
      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      // Atualizar campos manualmente
      Object.assign(productionSheet, req.body);
      await productionSheet.save();

      res.json({
        success: true,
        message: 'Production sheet updated successfully',
        data: productionSheet
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
        message: 'Error updating production sheet',
        error: error.message
      });
    }
  }

  // PATCH /production-sheets/:id/stage - Update only stage
  async updateStage(req, res) {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      if (!stage) {
        return res.status(400).json({
          success: false,
          message: 'Stage is required'
        });
      }

      const validStages = ['PRINTING', 'CALENDERING', 'FINISHED'];
      if (!validStages.includes(stage)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stage'
        });
      }

      const productionSheet = await ProductionSheet.findByIdAndUpdate(
        id,
        { stage },
        { new: true }
      );

      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      // ✅ NOVO: Se o stage for FINISHED, atualizar a production order correspondente
      if (stage === 'FINISHED') {
        try {
          const ProductionOrder = require('../models/ProductionOrder');
          
          const productionOrder = await ProductionOrder.findById(productionSheet.productionOrderId);
          
          if (productionOrder) {
            productionOrder.status = 'FINALIZED';
            await productionOrder.save();
            
            console.log(`✅ Production Order ${productionOrder.internalReference} atualizada para FINALIZED`);
          } else {
            console.warn(`⚠️ Production Order não encontrada para ProductionSheet ${id}`);
          }
        } catch (orderError) {
          console.error('❌ Erro ao atualizar Production Order:', orderError);
          // Não falha a operação principal, apenas loga o erro
        }
      }

      res.json({
        success: true,
        message: 'Stage updated successfully',
        data: productionSheet
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
        message: 'Error updating stage',
        error: error.message
      });
    }
  }

  // PATCH /production-sheets/:id/advance-stage - Advance to next stage
  async advanceStage(req, res) {
    try {
      const { id } = req.params;
      
      const productionSheet = await ProductionSheet.findById(id);
      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      const advanced = productionSheet.advanceStage();
      if (!advanced) {
        return res.status(400).json({
          success: false,
          message: 'Production sheet is already at the final stage'
        });
      }

      await productionSheet.save();

      res.json({
        success: true,
        message: 'Stage advanced successfully',
        data: productionSheet
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
        message: 'Error advancing stage',
        error: error.message
      });
    }
  }

  // DELETE /production-sheets/:id - Deactivate production sheet (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const productionSheet = await ProductionSheet.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );

      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      res.json({
        success: true,
        message: 'Production sheet deactivated successfully',
        data: productionSheet
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
        message: 'Error deactivating production sheet',
        error: error.message
      });
    }
  }

  // POST /production-sheets/:id/activate - Reactivate production sheet
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      const productionSheet = await ProductionSheet.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      );

      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      res.json({
        success: true,
        message: 'Production sheet reactivated successfully',
        data: productionSheet
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
        message: 'Error reactivating production sheet',
        error: error.message
      });
    }
  }

  // GET /production-sheets/stats - Production sheet statistics
  async stats(req, res) {
    try {
      const stats = await ProductionSheet.getStatistics();
      
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

  // GET /production-sheets/by-production-order/:productionOrderId - Get production sheet by production order
  async getByProductionOrder(req, res) {
    try {
      const { productionOrderId } = req.params;

      const productionSheet = await ProductionSheet.getByProductionOrder(productionOrderId);

      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found for this production order'
        });
      }

      res.json({
        success: true,
        data: productionSheet
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
        message: 'Error fetching production sheet',
        error: error.message
      });
    }
  }

  // GET /production-sheets/by-machine/:machineNumber - Get production sheets by machine
  async getByMachine(req, res) {
    try {
      const { machineNumber } = req.params;
      const machine = parseInt(machineNumber);

      if (![1, 2, 3, 4].includes(machine)) {
        return res.status(400).json({
          success: false,
          message: 'Machine number must be 1, 2, 3, or 4'
        });
      }

      const productionSheets = await ProductionSheet.getByMachine(machine);

      res.json({
        success: true,
        data: productionSheets
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching production sheets',
        error: error.message
      });
    }
  }
}

module.exports = new ProductionSheetController();