const Development = require('../models/Development');
const Client = require('../models/Client');
const { validationResult } = require('express-validator');

class DevelopmentController {
  // GET /developments - List all developments
  async index(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status,
        clientId,
        active,
        sortBy = 'createdAt',
        order = 'desc'
      } = req.query;

      // Validar e converter parâmetros de paginação
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const query = {};
      
      // Filter by status
      if (status) {
        query.status = status;
      }
      
      // Filter by client
      if (clientId) {
        query.clientId = clientId;
      }
      
      // Filter by active status
      if (active !== undefined) {
        query.active = active === 'true';
      }
      
      // Text search
      if (search) {
        const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
        query.$or = [
          { internalReference: { $regex: searchRegex, $options: 'i' } },
          { clientReference: { $regex: searchRegex, $options: 'i' } },
          { description: { $regex: searchRegex, $options: 'i' } }
        ];
      }

      // Configurar ordenação
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortField = ['internalReference', 'description', 'status', 'createdAt', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';

      // Buscar developments com paginação (client será populado automaticamente)
      const [developments, totalCount] = await Promise.all([
        Development.find(query)
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .lean({ virtuals: true }), // Para incluir virtuals no lean
        Development.countDocuments(query)
      ]);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalCount / limitNum);
      const hasNext = pageNum < totalPages;
      const hasPrev = pageNum > 1;
      
      res.json({
        success: true,
        data: developments,
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
      console.error('Erro ao buscar developments:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar developments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /developments/:id - Get development by ID
  async show(req, res) {
    try {
      const { id } = req.params;
      // Client será populado automaticamente pelo virtual populate
      const development = await Development.findById(id);

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        data: development
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
        message: 'Error fetching development',
        error: error.message
      });
    }
  }

  // GET /developments/reference/:internalReference - Get by internal reference
  async showByReference(req, res) {
    try {
      const { internalReference } = req.params;
      const development = await Development.findOne({ 
        internalReference: internalReference.toUpperCase() 
      });

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        data: development
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching development',
        error: error.message
      });
    }
  }

  // POST /developments - Create new development
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

      // Verify client exists
      const client = await Client.findById(req.body.clientId);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const development = new Development(req.body);
      await development.save();

      // Buscar novamente para incluir os dados do cliente (virtual populate)
      const developmentWithClient = await Development.findById(development._id);

      res.status(201).json({
        success: true,
        message: 'Development created successfully',
        data: developmentWithClient
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

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Internal reference already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating development',
        error: error.message
      });
    }
  }

  // PUT /developments/:id - Update development
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

      // If clientId is being updated, verify client exists
      if (req.body.clientId) {
        const client = await Client.findById(req.body.clientId);
        if (!client) {
          return res.status(404).json({
            success: false,
            message: 'Client not found'
          });
        }
      }

      const development = await Development.findByIdAndUpdate(
        id,
        req.body,
        { 
          new: true, 
          runValidators: true 
        }
      );

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        message: 'Development updated successfully',
        data: development
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
        message: 'Error updating development',
        error: error.message
      });
    }
  }

  // PATCH /developments/:id/status - Update only status
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

      const validStatuses = ['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const development = await Development.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: development
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

  // DELETE /developments/:id - Deactivate development (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findByIdAndUpdate(
        id,
        { active: false },
        { new: true }
      );

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        message: 'Development deactivated successfully',
        data: development
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
        message: 'Error deactivating development',
        error: error.message
      });
    }
  }

  // POST /developments/:id/activate - Reactivate development
  async activate(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findByIdAndUpdate(
        id,
        { active: true },
        { new: true }
      );

      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development not found'
        });
      }

      res.json({
        success: true,
        message: 'Development reactivated successfully',
        data: development
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
        message: 'Error reactivating development',
        error: error.message
      });
    }
  }

  // GET /developments/stats - Development statistics
  async stats(req, res) {
    try {
      const stats = await Development.getStatistics();
      
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

  // GET /developments/by-client/:clientId - Get developments by client
  async getByClient(req, res) {
    try {
      const { clientId } = req.params;
      const { status, active = true } = req.query;

      const query = { clientId: clientId };
      
      if (status) {
        query.status = status;
      }
      
      if (active !== undefined) {
        query.active = active === 'true';
      }

      const developments = await Development.find(query)
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: developments
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid client ID'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error fetching developments',
        error: error.message
      });
    }
  }
}

module.exports = new DevelopmentController();