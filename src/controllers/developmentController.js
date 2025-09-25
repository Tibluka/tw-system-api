const Development = require('../models/Development');
const Client = require('../models/Client');
const { validationResult } = require('express-validator');
const { deleteImage, generateOptimizedUrls } = require('../config/cloudinary');

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
        active = true,
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
      query.active = active;
      
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
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar developments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /developments/:id - Get development by ID, internalReference or clientReference
  async show(req, res) {
    try {
      const { id } = req.params;
      let development = null;

      // Tentar buscar por MongoDB ObjectId primeiro
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        development = await Development.findById(id);
      }
      
      // Se não encontrou, tentar por internalReference
      if (!development) {
        development = await Development.findOne({ 
          internalReference: id.toUpperCase()
        });
      }
      
      // Se ainda não encontrou, tentar por clientReference
      if (!development) {
        development = await Development.findOne({ 
          clientReference: id 
        });
      }

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
  
      // ✅ NOVA LÓGICA - Processar productionType baseado no tipo
      if (req.body.productionType.type === 'localized') {
        // Se não tiver additionalInfo ou sizes, criar com tamanhos padrão
        if (!req.body.productionType.additionalInfo) {
          req.body.productionType.additionalInfo = {
            variant: '',
            sizes: [
              { size: 'PP', value: 0 },
              { size: 'P', value: 0 },
              { size: 'M', value: 0 },
              { size: 'G', value: 0 },
              { size: 'G1', value: 0 },
              { size: 'G2', value: 0 }
            ]
          };
        }
      } else {
        req.body.productionType.meters = 0
      }
  
      const development = new Development(req.body);
      await development.save();
  
      // Retornar com populate
      const savedDevelopment = await Development.findById(development._id);
  
      res.status(201).json({
        success: true,
        message: 'Development created successfully',
        data: savedDevelopment
      });
  
    } catch (error) {
      console.error('Error creating development:', error);
  
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
        message: 'Internal server error'
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

      // ✅ NOVA LÓGICA - Processar productionType baseado no tipo
      if (req.body.productionType.type === 'localized') {
        // Se não tiver additionalInfo ou sizes, criar com tamanhos padrão
        if (!req.body.productionType.additionalInfo) {
          req.body.productionType.additionalInfo = {
            variant: '',
            sizes: [
              { size: 'PP', value: 0 },
              { size: 'P', value: 0 },
              { size: 'M', value: 0 },
              { size: 'G', value: 0 },
              { size: 'G1', value: 0 },
              { size: 'G2', value: 0 }
            ]
          };
        }
      } else {
        req.body.productionType.meters = 0
      }
  
      
      const development = await Development.findByIdAndUpdate(
        id,
        req.body
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

  async uploadImage(req, res) {
    const start = Date.now();
    
    try {
      const { id } = req.params; // ID do development vem da rota
      
      // Verificação mínima
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo enviado' 
        });
      }
  
      // Verificar se o development existe
      const development = await Development.findById(id);
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development não encontrado'
        });
      }
  
      // Se já tem imagem, podemos opcionalmente deletar a anterior
      if (development.pieceImage && development.pieceImage.publicId) {
        try {
          const { cloudinary } = require('../config/cloudinary');
          await cloudinary.uploader.destroy(development.pieceImage.publicId);
        } catch (cloudinaryError) {
          console.warn('Erro ao deletar imagem anterior:', cloudinaryError.message);
          // Continua com o upload mesmo se não conseguir deletar a anterior
        }
      }
  
      // Estrutura da imagem para salvar no pieceImage
      // Para multer-storage-cloudinary, as propriedades são diferentes:
      const imageData = {
        url: req.file.path, // multer-storage-cloudinary usa 'path'
        publicId: req.file.filename, // multer-storage-cloudinary usa 'filename' para publicId
        filename: req.file.originalname, // nome original do arquivo
        optimizedUrls: {
          // Como não tem eager transforms, vamos gerar URLs manualmente
          thumbnail: req.file.path.replace('/upload/', '/upload/w_150,h_150,c_fill,q_auto:low/'),
          small: req.file.path.replace('/upload/', '/upload/w_300,h_300,c_limit,q_auto:low/'),
          medium: req.file.path.replace('/upload/', '/upload/w_600,h_600,c_limit,q_auto:good/'),
          large: req.file.path.replace('/upload/', '/upload/w_1200,h_1200,c_limit,q_auto:good/'),
          original: req.file.path
        },
        uploadedAt: new Date()
      };
  
      // Atualizar o development com a nova imagem
      const updatedDevelopment = await Development.findByIdAndUpdate(
        id,
        { 
          'pieceImage.url': imageData.url,
          'pieceImage.publicId': imageData.publicId,
          'pieceImage.filename': imageData.filename,
          'pieceImage.optimizedUrls': imageData.optimizedUrls,
          'pieceImage.uploadedAt': imageData.uploadedAt
        },
        { 
          new: true, 
          runValidators: true 
        }
      );
  
      console.log(`⚡ Upload e salvamento completo em: ${Date.now() - start}ms`);
  
      // Resposta com dados completos
      res.json({
        success: true,
        message: 'Imagem enviada e salva com sucesso',
        data: {
          developmentId: development._id,
          image: updatedDevelopment.pieceImage,
          urls: updatedDevelopment.pieceImage.optimizedUrls
        },
        time: `${Date.now() - start}ms`
      });
  
    } catch (error) {
      console.error('Upload error:', error);
      
      // Diferentes tipos de erro para melhor debug
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'ID de development inválido'
        });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação',
          details: error.message
        });
      }
  
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // DELETE /developments/:id/image - Remover imagem
  async removeImage(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findById(id);
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development não encontrado'
        });
      }

      // Verificar se tem imagem para remover
      if (!development.pieceImage || !development.pieceImage.publicId) {
        return res.status(400).json({
          success: false,
          message: 'Development não possui imagem para remover'
        });
      }

      // Deletar imagem do Cloudinary
      try {
        await deleteImage(development.pieceImage.publicId);
      } catch (error) {
        // Continua para limpar do banco mesmo com erro
      }

      // Remover referência da imagem do banco
      const updatedDevelopment = await Development.findByIdAndUpdate(
        id,
        {
          'pieceImage.url': null,
          'pieceImage.publicId': null,
          'pieceImage.filename': null,
          'pieceImage.optimizedUrls': {},
          'pieceImage.uploadedAt': null
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Imagem removida com sucesso',
        data: updatedDevelopment
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao remover imagem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /developments/:id/image - Obter informações da imagem
  async getImage(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findById(id).select('pieceImage');
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development não encontrado'
        });
      }

      if (!development.pieceImage || !development.pieceImage.url) {
        return res.status(404).json({
          success: false,
          message: 'Development não possui imagem'
        });
      }

      res.json({
        success: true,
        data: {
          image: development.pieceImage,
          urls: development.pieceImage.optimizedUrls
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar imagem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // DELETE /developments/:id/image - Remover imagem
  async removeImage(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findById(id);
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development não encontrado'
        });
      }

      // Verificar se tem imagem para remover
      if (!development.pieceImage || !development.pieceImage.publicId) {
        return res.status(400).json({
          success: false,
          message: 'Development não possui imagem para remover'
        });
      }

      // Deletar imagem do Cloudinary
      try {
        await deleteImage(development.pieceImage.publicId);
      } catch (error) {
        // Continua para limpar do banco mesmo com erro
      }

      // Remover referência da imagem do banco
      const updatedDevelopment = await Development.findByIdAndUpdate(
        id,
        {
          'pieceImage.url': null,
          'pieceImage.publicId': null,
          'pieceImage.filename': null,
          'pieceImage.optimizedUrls': {},
          'pieceImage.uploadedAt': null
        },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Imagem removida com sucesso',
        data: updatedDevelopment
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao remover imagem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // GET /developments/:id/image - Obter informações da imagem
  async getImage(req, res) {
    try {
      const { id } = req.params;
      
      const development = await Development.findById(id).select('pieceImage');
      if (!development) {
        return res.status(404).json({
          success: false,
          message: 'Development não encontrado'
        });
      }

      if (!development.pieceImage || !development.pieceImage.url) {
        return res.status(404).json({
          success: false,
          message: 'Development não possui imagem'
        });
      }

      res.json({
        success: true,
        data: {
          image: development.pieceImage,
          urls: development.pieceImage.optimizedUrls
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar imagem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new DevelopmentController();