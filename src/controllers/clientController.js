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
        ativo,
        sortBy = 'razaoSocial',
        order = 'asc'
      } = req.query;

      const query = {};
      
      // Filtro por status ativo
      if (ativo !== undefined) {
        query.ativo = ativo === 'true';
      }
      
      // Busca por texto
      if (search) {
        query.$or = [
          { razaoSocial: { $regex: search, $options: 'i' } },
          { cnpj: { $regex: search.replace(/[^\d]/g, ''), $options: 'i' } },
          { 'contato.email': { $regex: search, $options: 'i' } }
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: order === 'desc' ? -1 : 1 }
      };

      const clients = await Client.paginate(query, options);
      
      res.json({
        success: true,
        data: clients.docs,
        pagination: {
          currentPage: clients.page,
          totalPages: clients.totalPages,
          totalItems: clients.totalDocs,
          hasNext: clients.hasNextPage,
          hasPrev: clients.hasPrevPage
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar clientes',
        error: error.message
      });
    }
  }

  // GET /clients/:id - Buscar cliente por ID
  async show(req, res) {
    try {
      const { id } = req.params;
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
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao buscar cliente',
        error: error.message
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

      // Verificar se CNPJ já existe
      const existingClient = await Client.findOne({ 
        cnpj: req.body.cnpj.replace(/[^\d]/g, '') 
      });
      
      if (existingClient) {
        return res.status(409).json({
          success: false,
          message: 'Cliente com este CNPJ já existe'
        });
      }

      const client = new Client(req.body);
      await client.save();

      res.status(201).json({
        success: true,
        message: 'Cliente criado com sucesso',
        data: client
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
        message: 'Erro ao criar cliente',
        error: error.message
      });
    }
  }

  // PUT /clients/:id - Atualizar cliente
  async update(req, res) {
    try {
      const { id } = req.params;
      
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
        const existingClient = await Client.findOne({ 
          cnpj: req.body.cnpj.replace(/[^\d]/g, ''),
          _id: { $ne: id }
        });
        
        if (existingClient) {
          return res.status(409).json({
            success: false,
            message: 'Outro cliente já possui este CNPJ'
          });
        }
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
        message: 'Erro ao atualizar cliente',
        error: error.message
      });
    }
  }

  // DELETE /clients/:id - Desativar cliente (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const client = await Client.findByIdAndUpdate(
        id,
        { ativo: false },
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
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao desativar cliente',
        error: error.message
      });
    }
  }

  // POST /clients/:id/activate - Reativar cliente
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      const client = await Client.findByIdAndUpdate(
        id,
        { ativo: true },
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
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao reativar cliente',
        error: error.message
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
            ativos: { $sum: { $cond: ['$ativo', 1, 0] } },
            inativos: { $sum: { $cond: ['$ativo', 0, 1] } },
            valorMedioMetro: { $avg: '$valores.valorPorMetro' },
            valorMedioPeca: { $avg: '$valores.valorPorPeca' }
          }
        }
      ]);

      const result = stats[0] || {
        total: 0,
        ativos: 0,
        inativos: 0,
        valorMedioMetro: 0,
        valorMedioPeca: 0
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas',
        error: error.message
      });
    }
  }
}

module.exports = new ClientController();