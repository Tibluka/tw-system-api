// controllers/productionReceiptController.js

const ProductionReceipt = require('../models/ProductionReceipt');
const DeliverySheet = require('../models/DeliverySheet');
const { validationResult } = require('express-validator');
const { ERROR_CODES } = require('../constants/errorCodes');
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
    this.getByDeliverySheet = this.getByDeliverySheet.bind(this);
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
      const deliverySheetCollection = DeliverySheet.collection.name;
      const productionSheetCollection = mongoose.model('ProductionSheet').collection.name;
      const productionOrderCollection = mongoose.model('ProductionOrder').collection.name;
      const developmentCollection = mongoose.model('Development').collection.name;
      const clientCollection = mongoose.model('Client').collection.name;

      console.log('Collection names:', {
        deliverySheets: deliverySheetCollection,
        productionSheets: productionSheetCollection,
        productionOrders: productionOrderCollection,
        developments: developmentCollection,
        clients: clientCollection
      });

      // ✅ CORRIGIDO: Pipeline de agregação mais robusto
      const pipeline = [
        // Join com DeliverySheet
        {
          $lookup: {
            from: deliverySheetCollection,
            localField: 'deliverySheetId',
            foreignField: '_id',
            as: 'deliverySheet'
          }
        },
        { $unwind: '$deliverySheet' },
        
        // Join com ProductionSheet
        {
          $lookup: {
            from: productionSheetCollection,
            localField: 'deliverySheet.productionSheetId',
            foreignField: '_id',
            as: 'productionSheet'
          }
        },
        { $unwind: '$productionSheet' },
        
        // Join com ProductionOrder
        {
          $lookup: {
            from: productionOrderCollection,
            localField: 'productionSheet.productionOrderId',
            foreignField: '_id',
            as: 'productionOrder'
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
        { $unwind: '$client' },
        
        // Filtrar por clientId
        {
          $match: {
            'client._id': clientObjectId,
            active: true
          }
        }
      ];

      // Adicionar outros filtros
      if (paymentStatus) {
        pipeline.push({ $match: { paymentStatus } });
      }
      
      if (paymentMethod) {
        pipeline.push({ $match: { paymentMethod } });
      }
      
      if (overdue === 'true') {
        pipeline.push({ 
          $match: { 
            paymentStatus: 'PENDING',
            dueDate: { $lt: new Date() }
          } 
        });
      }

      // Busca por texto
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pipeline.push({
          $match: {
            $or: [
              { internalReference: { $regex: searchRegex, $options: 'i' } },
              { notes: { $regex: searchRegex, $options: 'i' } }
            ]
          }
        });
      }

      // Contagem total
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await ProductionReceipt.aggregate(countPipeline);
      const totalCount = countResult.length > 0 ? countResult[0].total : 0;

      // Ordenação
      const finalOrder = sortOrder || order;
      const sortOrderValue = finalOrder === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'paymentStatus', 'paymentMethod', 'totalAmount', 'issueDate', 'dueDate', 'createdAt', 'updatedAt'].includes(sortBy) ? 
        sortBy : 'createdAt';

      pipeline.push(
        { $sort: { [sortField]: sortOrderValue } },
        { $skip: skip },
        { $limit: limitNum }
      );

      // Executar query
      const productionReceipts = await ProductionReceipt.aggregate(pipeline);

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
        sortOrder,
        createdFrom,
        createdTo
      } = req.query;

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
        delete query.active;
      }
      
      // Filter by payment status
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }
      
      // Filter by payment method
      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }

      // ✅ NOVO: Filtros por data de criação
      if (createdFrom || createdTo) {
        query.createdAt = {};
        
        if (createdFrom) {
          const fromDate = new Date(createdFrom);
          fromDate.setHours(0, 0, 0, 0);
          query.createdAt.$gte = fromDate;
          console.log('createdFrom (parsed):', fromDate.toISOString());
        }
        
        if (createdTo) {
          const toDate = new Date(createdTo);
          toDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = toDate;
          console.log('createdTo (parsed):', toDate.toISOString());
        }
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { notes: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      console.log('Final MongoDB Query:', JSON.stringify(query, null, 2));

      // ✅ CORRIGIDO: Aceitar tanto 'order' quanto 'sortOrder'
      const finalOrder = sortOrder || order;
      const sortOrderValue = finalOrder === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'paymentStatus', 'paymentMethod', 'totalAmount', 'issueDate', 'dueDate', 'createdAt', 'updatedAt'].includes(sortBy) ? 
        sortBy : 'createdAt';

      // Execute query with aggregation pipeline for clean nested structure
      const [productionReceipts, totalCount] = await Promise.all([
        ProductionReceipt.aggregate([
          { $match: query },
          {
            $lookup: {
              from: 'deliverysheets',
              localField: 'deliverySheetId',
              foreignField: '_id',
              as: 'deliverySheet'
            }
          },
          { $unwind: '$deliverySheet' },
          {
            $lookup: {
              from: 'productionsheets',
              localField: 'deliverySheet.productionSheetId',
              foreignField: '_id',
              as: 'productionSheet'
            }
          },
          { $unwind: '$productionSheet' },
          {
            $lookup: {
              from: 'productionorders',
              localField: 'productionSheet.productionOrderId',
              foreignField: '_id',
              as: 'productionOrder'
            }
          },
          { $unwind: '$productionOrder' },
          {
            $lookup: {
              from: 'developments',
              localField: 'productionOrder.developmentId',
              foreignField: '_id',
              as: 'development'
            }
          },
          { $unwind: '$development' },
          {
            $lookup: {
              from: 'clients',
              localField: 'development.clientId',
              foreignField: '_id',
              as: 'client'
            }
          },
          { $unwind: '$client' },
          {
            $project: {
              _id: 1,
              internalReference: 1,
              paymentMethod: 1,
              paymentStatus: 1,
              totalAmount: 1,
              paidAmount: 1,
              remainingAmount: 1,
              dueDate: 1,
              paymentDate: 1,
              issueDate: 1,
              notes: 1,
              active: 1,
              createdAt: 1,
              updatedAt: 1,
              deliverySheet: {
                _id: '$deliverySheet._id',
                internalReference: '$deliverySheet.internalReference',
                deliveryDate: '$deliverySheet.deliveryDate',
                totalValue: '$deliverySheet.totalValue',
                notes: '$deliverySheet.notes',
                invoiceNumber: '$deliverySheet.invoiceNumber',
                address: '$deliverySheet.address',
                status: '$deliverySheet.status',
                productionSheet: {
                  _id: '$productionSheet._id',
                  internalReference: '$productionSheet.internalReference',
                  entryDate: '$productionSheet.entryDate',
                  expectedExitDate: '$productionSheet.expectedExitDate',
                  machine: '$productionSheet.machine',
                  stage: '$productionSheet.stage',
                  temperature: '$productionSheet.temperature',
                  velocity: '$productionSheet.velocity',
                  productionOrder: {
                    _id: '$productionOrder._id',
                    internalReference: '$productionOrder.internalReference',
                    fabricType: '$productionOrder.fabricType',
                    observations: '$productionOrder.observations',
                    hasCraft: '$productionOrder.hasCraft',
                    fabricWidth: '$productionOrder.fabricWidth',
                    development: {
                      _id: '$development._id',
                      internalReference: '$development.internalReference',
                      clientReference: '$development.clientReference',
                      pieceImage: '$development.pieceImage',
                      productionType: '$development.productionType',
                      status: '$development.status',
                      client: {
                        _id: '$client._id',
                        acronym: '$client.acronym',
                        companyName: '$client.companyName',
                        cnpj: '$client.cnpj',
                        contact: '$client.contact',
                        address: '$client.address',
                        values: '$client.values'
                      }
                    }
                  }
                }
              }
            }
          },
          { $sort: { [sortField]: sortOrderValue } },
          { $skip: skip },
          { $limit: limitNum }
        ]),
        ProductionReceipt.countDocuments(query)
      ]);

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

  // GET /production-receipts/by-delivery-sheet/:deliverySheetId
  async getByDeliverySheet(req, res) {
    try {
      const { deliverySheetId } = req.params;

      const productionReceipt = await ProductionReceipt.getByDeliverySheet(deliverySheetId);

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found for this delivery sheet'
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
          message: 'Invalid delivery sheet ID'
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
          .populate({
            path: 'deliverySheetId',
            populate: {
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
            }
          });
      } else {
        productionReceipt = await ProductionReceipt.findOne({ internalReference: id })
          .populate({
            path: 'deliverySheetId',
            populate: {
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
            }
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
          code: ERROR_CODES.VALIDATION_ERROR,
          errors: errors.array()
        });
      }

      // Verificar se a delivery sheet existe e está entregue
      const deliverySheet = await DeliverySheet.findById(req.body.deliverySheetId)
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

      if (deliverySheet.status !== 'DELIVERED') {
        return res.status(400).json({
          success: false,
          message: 'Receipt can only be created for delivered items'
        });
      }


      // Verificar se já existe um production receipt para esta delivery sheet
      const existingReceipt = await ProductionReceipt.findOne({
        deliverySheetId: req.body.deliverySheetId,
        active: true,
        deliverySheetId: { $ne: null }
      });

      if (existingReceipt) {
        return res.status(400).json({
          success: false,
          message: 'Production receipt already exists for this delivery sheet',
          code: ERROR_CODES.PRODUCTION_RECEIPT_ALREADY_EXISTS
        });
      }

      // Remover internalReference do payload para deixar o pre-save hook gerar
      const { internalReference, ...receiptData } = req.body;
      
      // Criar o production receipt
      const productionReceipt = new ProductionReceipt(receiptData);
      await productionReceipt.save();

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

      // ✅ CORRIGIDO: Buscar o documento primeiro para validações manuais
      const productionReceipt = await ProductionReceipt.findById(id);

      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      // ✅ ATUALIZAR: Aplicar as mudanças
      Object.assign(productionReceipt, updateData);

      // ✅ CALCULAR: remainingAmount automaticamente
      productionReceipt.remainingAmount = productionReceipt.totalAmount - productionReceipt.paidAmount;

      // ✅ SALVAR: Com validações
      await productionReceipt.save();

      // ✅ POPULATE: Para retornar dados completos do DeliverySheet
      await productionReceipt.populate({
        path: 'deliverySheetId',
        populate: {
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
        }
      });

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Production receipt updated successfully'
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

      const productionReceipt = await ProductionReceipt.findById(id);
      
      if (!productionReceipt) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      if (productionReceipt.paymentStatus === 'PAID') {
        return res.status(400).json({
          success: false,
          message: 'Payment already completed'
        });
      }

      const newPaidAmount = productionReceipt.paidAmount + amount;
      if (newPaidAmount > productionReceipt.totalAmount) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount exceeds remaining balance'
        });
      }

      // Atualizar dados de pagamento
      productionReceipt.paidAmount = newPaidAmount;
      productionReceipt.remainingAmount = productionReceipt.totalAmount - productionReceipt.paidAmount;
      
      if (productionReceipt.paidAmount >= productionReceipt.totalAmount) {
        productionReceipt.paymentStatus = 'PAID';
        productionReceipt.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      }

      await productionReceipt.save();

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

  // ✅✅✅ CORRIGIDO: PATCH /production-receipts/:id/payment-status
  // Este método agora atualiza APENAS o status de pagamento,
  // BYPASSANDO o middleware pre('save') que recalcula automaticamente o status
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
      const { paymentStatus, paymentDate } = req.body;

      // ✅ VALIDAÇÃO: Verificar se o ID é válido
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid production receipt ID'
        });
      }

      // ✅ PREPARAR: Dados para atualização
      const updateData = { paymentStatus };

      // ✅ OPCIONAL: Se fornecida paymentDate, incluir na atualização
      if (paymentDate) {
        updateData.paymentDate = paymentDate;
      }

      // ✅✅✅ CRÍTICO: Usar updateOne para BYPASSAR o middleware pre('save')
      // Isso permite atualizar o status manualmente sem que o middleware
      // recalcule baseado em paidAmount vs totalAmount
      const result = await ProductionReceipt.updateOne(
        { _id: id },
        { $set: updateData }
      );

      // ✅ VERIFICAR: Se o documento foi encontrado
      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Production receipt not found'
        });
      }

      // ✅ BUSCAR: Documento atualizado com populate para retornar ao frontend
      const productionReceipt = await ProductionReceipt.findById(id)
        .populate({
          path: 'deliverySheetId',
          populate: {
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
          }
        });

      res.json({
        success: true,
        data: productionReceipt,
        message: 'Payment status updated successfully'
      });
    } catch (error) {
      console.error('Error updating payment status:', error);

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
      ).populate({
        path: 'deliverySheetId',
        populate: {
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
        }
      });

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