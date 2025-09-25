// controllers/productionReceiptController.js

const ProductionReceipt = require('../models/ProductionReceipt');
const ProductionOrder = require('../models/ProductionOrder');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

class ProductionReceiptController {
  constructor() {
    // ✅ BIND de todos os métodos para garantir contexto correto
    this.index = this.index.bind(this);
    this.indexWithClientFilter = this.indexWithClientFilter.bind(this);
    this.show = this.show.bind(this);
    this.store = this.store.bind(this);
    this.update = this.update.bind(this);
    this.destroy = this.destroy.bind(this);
    this.stats = this.stats.bind(this);
    this.getByProductionOrder = this.getByProductionOrder.bind(this);
    this.getOverdue = this.getOverdue.bind(this);
    this.processPayment = this.processPayment.bind(this);
    this.updatePaymentStatus = this.updatePaymentStatus.bind(this);
    this.activate = this.activate.bind(this);
  }

  // ✅ CORRIGIDO: Método para lidar com filtro por clientId usando aggregation
  async indexWithClientFilter(req, res, params) {
    const {
      pageNum, limitNum, skip, clientId, search, paymentStatus,
      paymentMethod, productionOrderId, overdue, active,
      createdFrom, createdTo, sortBy, sortOrder, order
    } = params;

    try {
      // ✅ VALIDAÇÃO: Verificar se clientId é válido
      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: 'Client ID is required for this filter'
        });
      }

      // ✅ CORRIGIDO: Converter clientId para ObjectId de forma mais robusta
      let clientObjectId;
      try {
        clientObjectId = mongoose.Types.ObjectId.isValid(clientId) ? 
          new mongoose.Types.ObjectId(clientId) : null;
        
        if (!clientObjectId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid client ID format'
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid client ID format'
        });
      }

      // ✅ CORRIGIDO: Usar os nomes corretos das coleções do MongoDB
      // Vamos descobrir os nomes corretos das coleções
      const productionOrderCollection = ProductionOrder.collection.name;
      const developmentCollection = mongoose.model('Development').collection.name;
      const clientCollection = mongoose.model('Client').collection.name;

      console.log('Collection names:', {
        productionOrders: productionOrderCollection,
        developments: developmentCollection,
        clients: clientCollection
      });

      // ✅ CORRIGIDO: Pipeline de agregação mais robusto
      const pipeline = [
        // Join com ProductionOrder
        {
          $lookup: {
            from: productionOrderCollection,
            localField: 'productionOrderId',
            foreignField: '_id',
            as: 'productionOrder'
          }
        },
        // ✅ CORRIGIDO: Verificar se encontrou a production order
        {
          $match: {
            'productionOrder.0': { $exists: true } // Garantir que existe ao menos um elemento
          }
        },
        { $unwind: '$productionOrder' },
        
        // Join com Development
        {
          $lookup: {
            from: developmentCollection,
            localField: 'productionOrder.developmentId',
            foreignField: '_id',
            as: 'development'
          }
        },
        // ✅ CORRIGIDO: Verificar se encontrou o development
        {
          $match: {
            'development.0': { $exists: true }
          }
        },
        { $unwind: '$development' },
        
        // Join com Client
        {
          $lookup: {
            from: clientCollection,
            localField: 'development.clientId',
            foreignField: '_id',
            as: 'client'
          }
        },
        // ✅ CORRIGIDO: Verificar se encontrou o client
        {
          $match: {
            'client.0': { $exists: true }
          }
        },
        { $unwind: '$client' },
        
        // ✅ FILTRAR por clientId
        {
          $match: {
            'client._id': clientObjectId
          }
        }
      ];

      // ✅ CORRIGIDO: Aplicar filtros básicos de forma mais robusta
      const matchConditions = {};
      
      // Filtro de ativo/inativo
      if (active === 'false') {
        matchConditions.active = false;
      } else if (active !== 'all') {
        matchConditions.active = { $ne: false }; // Incluir true e undefined/null
      }

      // Outros filtros
      if (paymentStatus) {
        matchConditions.paymentStatus = paymentStatus;
      }
      
      if (paymentMethod) {
        matchConditions.paymentMethod = paymentMethod;
      }
      
      if (productionOrderId) {
        try {
          const prodOrderId = mongoose.Types.ObjectId.isValid(productionOrderId) ? 
            new mongoose.Types.ObjectId(productionOrderId) : null;
          if (prodOrderId) {
            matchConditions.productionOrderId = prodOrderId;
          }
        } catch (error) {
          console.warn('Invalid productionOrderId:', productionOrderId);
        }
      }

      // Filtro overdue
      if (overdue === 'true') {
        matchConditions.paymentStatus = 'PENDING';
        matchConditions.dueDate = { $lt: new Date() };
      }

      // Filtros por data
      if (createdFrom || createdTo) {
        matchConditions.createdAt = {};
        
        if (createdFrom) {
          try {
            const fromDate = new Date(createdFrom);
            fromDate.setHours(0, 0, 0, 0);
            matchConditions.createdAt.$gte = fromDate;
          } catch (error) {
            console.warn('Invalid createdFrom date:', createdFrom);
          }
        }
        
        if (createdTo) {
          try {
            const toDate = new Date(createdTo);
            toDate.setHours(23, 59, 59, 999);
            matchConditions.createdAt.$lte = toDate;
          } catch (error) {
            console.warn('Invalid createdTo date:', createdTo);
          }
        }
      }

      // Text search
      if (search && search.trim()) {
        const searchRegex = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        matchConditions.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { notes: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // ✅ ADICIONAR condições de match ao pipeline
      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }

      console.log('Aggregation Pipeline:', JSON.stringify(pipeline, null, 2));

      // ✅ CORRIGIDO: Preparar ordenação de forma mais robusta
      const finalOrder = sortOrder || order || 'desc';
      const sortOrderValue = finalOrder.toString().toLowerCase() === 'desc' ? -1 : 1;
      
      // Lista de campos válidos para ordenação
      const validSortFields = [
        'internalReference', 'paymentStatus', 'paymentMethod', 
        'totalAmount', 'issueDate', 'dueDate', 'createdAt', 'updatedAt'
      ];
      
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

      // Pipeline para contar total
      const countPipeline = [...pipeline, { $count: 'total' }];

      // Pipeline para buscar dados com paginação
      const dataPipeline = [
        ...pipeline,
        { $sort: { [sortField]: sortOrderValue } },
        { $skip: skip },
        { $limit: limitNum },
        // ✅ CORRIGIDO: Reestruturar dados para manter compatibilidade
        {
          $project: {
            _id: 1,
            internalReference: 1,
            paymentStatus: 1,
            paymentMethod: 1,
            totalAmount: 1,
            paidAmount: 1,
            remainingAmount: 1,
            issueDate: 1,
            dueDate: 1,
            paymentDate: 1,
            notes: 1,
            active: 1,
            createdAt: 1,
            updatedAt: 1,
            // ✅ MANTER estrutura esperada pelo frontend
            productionOrder: {
              _id: '$productionOrder._id',
              internalReference: '$productionOrder.internalReference',
              developmentId: '$productionOrder.developmentId',
              fabricType: '$productionOrder.fabricType',
              status: '$productionOrder.status',
              observations: '$productionOrder.observations',
              productionType: '$productionOrder.productionType',
              active: '$productionOrder.active',
              createdAt: '$productionOrder.createdAt',
              updatedAt: '$productionOrder.updatedAt',
              // ✅ DEVELOPMENT com CLIENT aninhado dentro do productionOrder
              development: {
                _id: '$development._id',
                internalReference: '$development.internalReference',
                clientId: '$development.clientId',
                clientReference: '$development.clientReference',
                description: '$development.description',
                pieceImage: '$development.pieceImage',
                variants: '$development.variants',
                productionType: '$development.productionType',
                status: '$development.status',
                active: '$development.active',
                createdAt: '$development.createdAt',
                updatedAt: '$development.updatedAt',
                // ✅ CLIENT aninhado dentro do development
                client: {
                  _id: '$client._id',
                  companyName: '$client.companyName',
                  name: '$client.name',
                  cnpj: '$client.cnpj',
                  acronym: '$client.acronym',
                  contact: '$client.contact',
                  values: '$client.values',
                  active: '$client.active',
                  createdAt: '$client.createdAt',
                  updatedAt: '$client.updatedAt'
                }
              }
            }
          }
        }
      ];

      // ✅ EXECUTAR ambas as queries com tratamento de erro
      let dataResult, countResult;
      
      try {
        [dataResult, countResult] = await Promise.all([
          ProductionReceipt.aggregate(dataPipeline),
          ProductionReceipt.aggregate(countPipeline)
        ]);
      } catch (aggregationError) {
        console.error('Aggregation error:', aggregationError);
        return res.status(500).json({
          success: false,
          message: 'Error in aggregation pipeline',
          error: aggregationError.message
        });
      }

      const productionReceipts = dataResult || [];
      const totalCount = countResult[0]?.total || 0;

      console.log(`Results found (with clientId ${clientId} filter):`, totalCount);

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
        },
        filters: {
          clientId: clientId,
          search: search,
          paymentStatus: paymentStatus,
          paymentMethod: paymentMethod,
          active: active
        }
      });

    } catch (error) {
      console.error('Error in productionReceipts.indexWithClientFilter:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching production receipts with client filter',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // GET /production-receipts - List all production receipts
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        clientId = null,
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

      // ✅ NOVO: Se há filtro por clientId, usar aggregation pipeline
      if (clientId) {
        return await this.indexWithClientFilter(req, res, {
          pageNum, limitNum, skip, clientId, search, paymentStatus, 
          paymentMethod, productionOrderId, overdue, active, 
          createdFrom, createdTo, sortBy, sortOrder, order
        });
      }

      // Lógica original para quando não há filtro por clientId
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

  // GET /production-receipts/by-production-order/:productionOrderId
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

  // GET /production-receipts/overdue
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

  // GET /production-receipts/:id
  async show(req, res) {
    try {
      const { id } = req.params;
      let productionReceipt;

      // Verificar se é um ObjectId válido ou buscar por internalReference
      if (mongoose.Types.ObjectId.isValid(id)) {
        productionReceipt = await ProductionReceipt.findById(id)
          .populate('productionOrderId', 'internalReference developmentId fabricType');
      } else {
        productionReceipt = await ProductionReceipt.findOne({ internalReference: id })
          .populate('productionOrderId', 'internalReference developmentId fabricType');
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
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts
  async store(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const productionReceipt = await ProductionReceipt.createProductionReceipt(req.body);

      res.status(201).json({
        success: true,
        data: productionReceipt,
        message: 'Production receipt created successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Production receipt with this internal reference already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating production receipt',
        error: error.message
      });
    }
  }

  // PUT /production-receipts/:id
  async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('productionOrderId', 'internalReference developmentId fabricType');

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Production receipt updated successfully'
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Production receipt with this internal reference already exists'
        });
      }

      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating production receipt',
        error: error.message
      });
    }
  }

  // POST /production-receipts/:id/process-payment
  async processPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { amount, paymentDate } = req.body;

      const productionReceipt = await ProductionReceipt.processPayment(id, amount, paymentDate);

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Payment processed successfully'
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already paid') || error.message.includes('exceeds')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error processing payment',
        error: error.message
      });
    }
  }

  // PATCH /production-receipts/:id/payment-status
  async updatePaymentStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { paymentStatus } = req.body;

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        { paymentStatus },
        { new: true, runValidators: true }
      ).populate('productionOrderId', 'internalReference developmentId fabricType');

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating payment status',
        error: error.message
      });
    }
  }

  // POST /production-receipts/:id/activate
  async activate(req, res) {
    try {
      const { id } = req.params;

      const productionReceipt = await ProductionReceipt.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      ).populate('productionOrderId', 'internalReference developmentId fabricType');

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Production receipt activated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error activating production receipt',
        error: error.message
      });
    }
  }

  // DELETE /production-receipts/:id
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
        message: 'Production receipt deactivated successfully'
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
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