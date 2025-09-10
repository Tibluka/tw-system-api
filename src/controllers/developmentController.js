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
        query.$or = [
          { internalReference: { $regex: search, $options: 'i' } },
          { clientReference: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { [sortBy]: order === 'desc' ? -1 : 1 },
        populate: {
          path: 'clientId',
          select: 'companyName cnpj contact.email'
        }
      };

      const developments = await Development.paginate(query, options);
      
      res.json({
        success: true,
        data: developments.docs,
        pagination: {
          currentPage: developments.page,
          totalPages: developments.totalPages,
          totalItems: developments.totalDocs,
          hasNext: developments.hasNextPage,
          hasPrev: developments.hasPrevPage
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching developments',
        error: error.message
      });
    }
  }

  // GET /developments/:id - Get development by ID
  async show(req, res) {
    try {
      const { id } = req.params;
      const development = await Development.findById(id)
        .populate('clientId', 'companyName cnpj contact address values');

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
      }).populate('clientId', 'companyName cnpj contact address values');

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

      // Populate client data in response
      await development.populate('clientId', 'companyName cnpj contact');

      res.status(201).json({
        success: true,
        message: 'Development created successfully',
        data: development
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

      // Verify client exists if clientId is being updated
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
      ).populate('clientId', 'companyName cnpj contact');

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

      const validStatuses = ['started', 'impediment', 'awaiting_approval', 'approved', 'refused'];
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
      ).populate('clientId', 'companyName cnpj contact');

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
      ).populate('clientId', 'companyName cnpj contact');

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

      const query = { clientId };
      
      if (status) {
        query.status = status;
      }
      
      if (active !== undefined) {
        query.active = active === 'true';
      }

      const developments = await Development.find(query)
        .sort({ createdAt: -1 })
        .populate('clientId', 'companyName');

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