const DeliverySheet = require('../models/DeliverySheet');
const ProductionSheet = require('../models/ProductionSheet');
const { validationResult } = require('express-validator');

class DeliverySheetController {
  constructor() {
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.store = this.store.bind(this);
    this.update = this.update.bind(this);
    this.destroy = this.destroy.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
  }

  // GET /delivery-sheets - List all delivery sheets
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status,
        productionSheetId,
        active,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // SEMPRE filtrar apenas delivery sheets ativos por padrão
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
      
      // Filter by production sheet
      if (productionSheetId) {
        query.productionSheetId = productionSheetId;
      }
      
      // Text search
      let searchFilter = null;
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        searchFilter = {
          $or: [
            { internalReference: { $regex: searchRegex, $options: 'i' } },
            { notes: { $regex: searchRegex, $options: 'i' } },
            { invoiceNumber: { $regex: searchRegex, $options: 'i' } }
          ]
        };
      }
      
      // Combine filters
      if (searchFilter) {
        Object.assign(query, searchFilter);
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'deliveryDate', 'status', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar delivery sheets com populate para preservar todos os campos
      const [deliverySheets, totalCount] = await Promise.all([
        DeliverySheet.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .populate({
            path: 'productionSheetId',
            populate: {
              path: 'productionOrderId',
              populate: {
                path: 'developmentId',
                populate: {
                  path: 'clientId'
                }
              }
            }
          }),
        DeliverySheet.countDocuments(query)
      ]);

      // Renomear productionSheetId para productionSheet e ajustar estrutura aninhada
      const formattedDeliverySheets = deliverySheets.map(sheet => {
        const sheetObj = JSON.parse(JSON.stringify(sheet));
        const productionSheet = sheetObj.productionSheetId;
        if (productionSheet && productionSheet.productionOrderId) {
          const productionOrder = productionSheet.productionOrderId;
          if (productionOrder && productionOrder.developmentId) {
            const development = productionOrder.developmentId;
            if (development && development.clientId) {
              development.client = development.clientId;
              delete development.clientId;
            }
            productionOrder.development = development;
            delete productionOrder.developmentId;
          }
          productionSheet.productionOrder = productionOrder;
          delete productionSheet.productionOrderId;
        }
        return {
          ...sheetObj,
          productionSheet,
          productionSheetId: undefined
        };
      });

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: formattedDeliverySheets,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNext,
          hasPrev,
          limit: limitNum
        }
      });
    } catch (error) {
      console.error('Error listing delivery sheets:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /delivery-sheets/:id - Get single delivery sheet
  async show(req, res) {
    try {
      const { id } = req.params;

      // Verificar se é ObjectId válido ou internalReference
      const mongoose = require('mongoose');
      let query;
      
      if (mongoose.Types.ObjectId.isValid(id)) {
        // Se for ObjectId válido, buscar por _id
        query = { _id: id };
      } else {
        // Se não for ObjectId, buscar por internalReference
        query = { internalReference: id.toUpperCase() };
      }

      const deliverySheet = await DeliverySheet.findOne(query)
        .populate({
          path: 'productionSheetId',
          populate: {
            path: 'productionOrderId',
            populate: {
              path: 'developmentId',
              populate: {
                path: 'clientId'
              }
            }
          }
        });

      if (!deliverySheet) {
        return res.status(404).json({
          success: false,
          message: 'Delivery sheet not found'
        });
      }

      res.json({
        success: true,
        data: deliverySheet
      });
    } catch (error) {
      console.error('Error getting delivery sheet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /delivery-sheets - Create new delivery sheet
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

      // Buscar production sheet pelo productionSheetId enviado pelo frontend
      const productionSheet = await ProductionSheet.findById(req.body.productionSheetId);
      
      if (!productionSheet) {
        return res.status(404).json({
          success: false,
          message: 'Production sheet not found'
        });
      }

      // Check if delivery sheet already exists for this production sheet
      const existingDeliverySheet = await DeliverySheet.findOne({ 
        productionSheetId: productionSheet._id,
        active: true 
      });

      if (existingDeliverySheet) {
        return res.status(409).json({
          success: false,
          message: 'Delivery sheet already exists for this production sheet'
        });
      }

      // Adicionar o productionSheetId ao payload
      req.body.productionSheetId = productionSheet._id;
      
      // Usar a internalReference do ProductionSheet
      req.body.internalReference = productionSheet.internalReference;
      
      console.log('🔍 Controller - productionSheet.internalReference:', productionSheet.internalReference);
      console.log('🔍 Controller - req.body.internalReference:', req.body.internalReference);

      const deliverySheet = new DeliverySheet(req.body);
      console.log('🔍 Controller - deliverySheet.internalReference antes do save:', deliverySheet.internalReference);
      await deliverySheet.save();
      console.log('🔍 Controller - deliverySheet.internalReference depois do save:', deliverySheet.internalReference);

      // Buscar novamente para incluir os dados populados
      const deliverySheetWithData = await DeliverySheet.findById(deliverySheet._id)
        .populate({
          path: 'productionSheetId',
          populate: {
            path: 'productionOrderId',
            populate: {
              path: 'developmentId',
              populate: {
                path: 'clientId'
              }
            }
          }
        });

      res.status(201).json({
        success: true,
        message: 'Delivery sheet created successfully',
        data: deliverySheetWithData
      });
    } catch (error) {
      console.error('Error creating delivery sheet:', error);
      
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
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // PUT /delivery-sheets/:id - Update delivery sheet
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

      const deliverySheet = await DeliverySheet.findById(id);
      if (!deliverySheet) {
        return res.status(404).json({
          success: false,
          message: 'Delivery sheet not found'
        });
      }

      // Atualizar campos manualmente
      Object.assign(deliverySheet, req.body);
      await deliverySheet.save();

      // Buscar novamente para incluir os dados populados
      const updatedDeliverySheet = await DeliverySheet.findById(id)
        .populate({
          path: 'productionSheetId',
          populate: {
            path: 'productionOrderId',
            populate: {
              path: 'developmentId',
              populate: {
                path: 'clientId'
              }
            }
          }
        });

      res.json({
        success: true,
        message: 'Delivery sheet updated successfully',
        data: updatedDeliverySheet
      });
    } catch (error) {
      console.error('Error updating delivery sheet:', error);
      
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
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // PUT /delivery-sheets/:id/status - Update delivery status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const deliverySheet = await DeliverySheet.findById(id);
      if (!deliverySheet) {
        return res.status(404).json({
          success: false,
          message: 'Delivery sheet not found'
        });
      }

      deliverySheet.status = status;
      await deliverySheet.save();

      res.json({
        success: true,
        message: 'Delivery status updated successfully',
        data: deliverySheet
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // DELETE /delivery-sheets/:id - Soft delete delivery sheet
  async destroy(req, res) {
    try {
      const { id } = req.params;

      const deliverySheet = await DeliverySheet.findById(id);
      if (!deliverySheet) {
        return res.status(404).json({
          success: false,
          message: 'Delivery sheet not found'
        });
      }

      // Soft delete
      deliverySheet.active = false;
      await deliverySheet.save();

      res.json({
        success: true,
        message: 'Delivery sheet deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting delivery sheet:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new DeliverySheetController();
