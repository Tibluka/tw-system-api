const Client = require('../models/Client');
const { validationResult } = require('express-validator');

class ClientController {
  // GET /clients - Listar todos os clientes
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        active,
        sortBy = 'companyName',
        order = 'asc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      
      // Filtro por status active
      if (active !== undefined) {
        query.active = active === 'true';
      }
      
      // Busca por texto
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { companyName: { $regex: searchRegex, $options: 'i' } },
          { cnpj: { $regex: search.replace(/[^\d]/g, ''), $options: 'i' } },
          { 'contact.email': { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['companyName', 'cnpj', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'companyName';

      // Buscar clientes com paginação
      const [clients, totalCount] = await Promise.all([
        Client.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .lean(), // Para melhor performance
        Client.countDocuments(query)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: clients,
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
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar clientes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /clients/:id - Buscar cliente por ID
  async show(req, res) {
    try {
      const { id } = req.params;

      // Validar formato do ID
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      const client = await Client.findById(id);

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /clients - Criar novo cliente
  async store(req, res) {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      // Limpar e validar CNPJ
      const cnpjLimpo = req.body.cnpj ? req.body.cnpj.replace(/[^\d]/g, '') : '';
      
      if (!cnpjLimpo || cnpjLimpo.length !== 14) {
        return res.status(400).json({
          success: false,
          message: 'CNPJ deve ter 14 dígitos'
        });
      }

      // Verificar se CNPJ já existe
      const existingClient = await Client.findOne({ cnpj: cnpjLimpo });
      
      if (existingClient) {
        return res.status(409).json({
          success: false,
          message: 'Cliente com este CNPJ já existe'
        });
      }

      // Criar novo cliente
      const clientData = {
        ...req.body,
        cnpj: cnpjLimpo
      };

      const client = new Client(clientData);
      await client.save();

      res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: client
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      
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

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Cliente com este CNPJ já existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao criar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // PUT /clients/:id - Atualizar cliente
  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato do ID
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
      }

      // Verificar se outro cliente já tem este CNPJ
      if (req.body.cnpj) {
        const cnpjLimpo = req.body.cnpj.replace(/[^\d]/g, '');
        
        if (cnpjLimpo.length !== 14) {
          return res.status(400).json({
            success: false,
            message: 'CNPJ deve ter 14 dígitos'
          });
        }

        const existingClient = await Client.findOne({ 
          cnpj: cnpjLimpo,
          _id: { $ne: id }
        });
        
        if (existingClient) {
          return res.status(409).json({
            success: false,
            message: 'Outro cliente já possui este CNPJ'
          });
        }

        req.body.cnpj = cnpjLimpo;
      }

      const client = await Client.findByIdAndUpdate(
        id,
        req.body,
        { 
          new: true, 
          runValidators: true 
        }
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Cliente atualizado com sucesso',
        data: client
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      
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

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Outro cliente já possui este CNPJ'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao atualizar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // DELETE /clients/:id - Desativar cliente (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato do ID
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const client = await Client.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Cliente desativado com sucesso',
        data: client
      });
    } catch (error) {
      console.error('Erro ao desativar cliente:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao desativar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // POST /clients/:id/activate - Reativar cliente
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato do ID
      if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }
      
      const client = await Client.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      );

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Cliente não encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Cliente reativado com sucesso',
        data: client
      });
    } catch (error) {
      console.error('Erro ao reativar cliente:', error);
      
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao reativar cliente',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /clients/stats - Estatísticas dos clientes
  async stats(req, res) {
    try {
      const stats = await Client.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ativos: { $sum: { $cond: ['$active', 1, 0] } },
            inativos: { $sum: { $cond: ['$active', 0, 1] } },
            valorMedioMetro: { $avg: '$values.valuePerMeter' },
            valorMedioPeca: { $avg: '$values.valuePerPiece' }
          }
        }
      ]);

      // Estatísticas por período (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentClients = await Client.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      const result = stats[0] || {
        total: 0,
        ativos: 0,
        inativos: 0,
        valorMedioMetro: 0,
        valorMedioPeca: 0
      };

      res.json({
        success: true,
        data: {
          ...result,
          clientesUltimos30Dias: recentClients,
          percentualAtivos: result.total > 0 ? Math.round((result.ativos / result.total) * 100) : 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar estatísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /clients/search - Busca avançada de clientes
  async search(req, res) {
    try {
      const { 
        q, // query geral
        companyName,
        cnpj,
        email,
        city,
        state,
        valorMin,
        valorMax,
        active = true,
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const query = {};

      // Filtro geral
      if (q) {
        const searchRegex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { companyName: { $regex: searchRegex, $options: 'i' } },
          { cnpj: { $regex: q.replace(/[^\d]/g, '') } },
          { 'contact.email': { $regex: searchRegex, $options: 'i' } },
          { 'address.city': { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Filtros específicos
      if (companyName) {
        query.companyName = { $regex: companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }

      if (cnpj) {
        query.cnpj = { $regex: cnpj.replace(/[^\d]/g, '') };
      }

      if (email) {
        query['contact.email'] = { $regex: email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }

      if (city) {
        query['address.city'] = { $regex: city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }

      if (state) {
        query['address.state'] = state.toUpperCase();
      }

      if (valorMin || valorMax) {
        query['values.valuePerMeter'] = {};
        if (valorMin) query['values.valuePerMeter'].$gte = parseFloat(valorMin);
        if (valorMax) query['values.valuePerMeter'].$lte = parseFloat(valorMax);
      }

      if (active !== undefined) {
        query.active = active === 'true';
      }

      const [clients, totalCount] = await Promise.all([
        Client.find(query)
          .sort({ companyName: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Client.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.json({
        success: true,
        data: clients,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: totalCount,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      console.error('Erro na busca avançada:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor na busca',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ClientController();