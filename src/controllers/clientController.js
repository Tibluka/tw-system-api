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

      console.log('📥 PARAMS RECEBIDOS:', { page, limit, search, active, sortBy, order });

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      // ✅ SEMPRE FILTRAR POR ATIVOS COMO PADRÃO
      const query = { active: true };
      
      // Permitir filtrar inativos apenas se explicitamente solicitado
      if (active === 'false') {
        query.active = false;
      } else if (active === 'all') {
        delete query.active; // Remove o filtro para mostrar todos
      }
      
      // ✅ BUSCA POR TEXTO CORRIGIDA
      if (search && search.trim() !== '') {
        const searchTerm = decodeURIComponent(search.trim()); // Decodificar URL
        console.log('🔍 TERMO DE BUSCA DECODIFICADO:', searchTerm);
        
        // Escape caracteres especiais para regex
        const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        console.log('🔍 TERMO ESCAPADO:', escapedSearch);
        
        // Remove formatação do CNPJ/telefone para busca apenas por números
        const numbersOnly = searchTerm.replace(/[^\d]/g, '');
        console.log('🔍 APENAS NÚMEROS:', numbersOnly);
        
        // ✅ QUERY $OR CORRIGIDA - cada condição deve ser específica e restritiva
        const searchConditions = [];
        
        // 1. Busca por nome da empresa (case insensitive)
        if (searchTerm.length >= 2) { // Mínimo 2 caracteres para evitar resultados muito amplos
          searchConditions.push({ 
            companyName: { 
              $regex: escapedSearch, 
              $options: 'i' 
            } 
          });
        }
        
        // 2. Busca por sigla/acronym (case insensitive)
        if (searchTerm.length >= 2) {
          searchConditions.push({ 
            acronym: { 
              $regex: escapedSearch, 
              $options: 'i' 
            } 
          });
        }
        
        // 3. Busca por CNPJ (apenas números, mínimo 4 dígitos)
        if (numbersOnly.length >= 4) {
          searchConditions.push({ 
            cnpj: { 
              $regex: numbersOnly, 
              $options: 'i' 
            } 
          });
        }
        
        // 4. Busca por email (mínimo 3 caracteres)
        if (searchTerm.length >= 3 && searchTerm.includes('@')) {
          searchConditions.push({ 
            'contact.email': { 
              $regex: escapedSearch, 
              $options: 'i' 
            } 
          });
        }
        
        // 5. Busca por nome do responsável (mínimo 2 caracteres)
        if (searchTerm.length >= 2) {
          searchConditions.push({ 
            'contact.responsibleName': { 
              $regex: escapedSearch, 
              $options: 'i' 
            } 
          });
        }
        
        // 6. Busca por telefone (apenas números, mínimo 4 dígitos)
        if (numbersOnly.length >= 4) {
          searchConditions.push({ 
            'contact.phone': { 
              $regex: numbersOnly 
            } 
          });
        }
        
        // ✅ SÓ ADICIONA $OR SE TIVER CONDIÇÕES VÁLIDAS
        if (searchConditions.length > 0) {
          query.$or = searchConditions;
          console.log('🔍 CONDIÇÕES DE BUSCA:', searchConditions.length);
        } else {
          // ❌ Se o termo de busca não atende aos critérios mínimos, 
          // força uma query que não retornará resultados
          query._id = new mongoose.Types.ObjectId('000000000000000000000000'); // ID inexistente
          console.log('🚫 TERMO DE BUSCA MUITO CURTO/INVÁLIDO - Forçando resultado vazio');
        }
      }

      console.log('🔍 QUERY FINAL:', JSON.stringify(query, null, 2));

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

      console.log(`📊 ENCONTRADOS: ${clients.length} clientes de ${totalCount} total`);

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
      console.error('❌ ERRO NO CLIENT CONTROLLER:', error);
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
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor na busca',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new ClientController();