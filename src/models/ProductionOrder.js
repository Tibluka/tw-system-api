const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema({
  // DEVELOPMENT REFERENCE (virtual populate para dados completos)
  developmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Development',
    required: [true, 'Development is required']
  },

  productionType: {
    type: {
      type: String,
      enum: ['rotary', 'localized'],
      required: [true, 'Production type is required']
    },
    // Para rotary: metros obrigatórios
    meters: {
      type: Number,
      min: [0, 'Meters must be positive'],
      required: function() {
        return this.productionType && this.productionType.type === 'rotary';
      }
    },
    // Para rotary: tipo de tecido no nível principal
    fabricType: {
      type: String,
      trim: true,
      maxlength: [100, 'Fabric type must have maximum 100 characters'],
      required: function() {
        return this.productionType && this.productionType.type === 'rotary';
      }
    },
    // Para localized: array de variantes
    variants: [{
      variantName: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Variant name must have maximum 100 characters']
      },
      fabricType: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Fabric type must have maximum 100 characters']
      },
      quantities: [{
        size: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
          enum: ['PP', 'P', 'M', 'G', 'G1', 'G2']
        },
        value: {
          type: Number,
          required: true
        }
      }]
    }]
  },

  // DADOS COPIADOS (para não depender de populate)
  internalReference: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Internal reference must have maximum 20 characters']
  },

  // STATUS INDEPENDENTE DA ORDEM DE PRODUÇÃO
  status: {
    type: String,
    enum: ['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'],
    default: 'CREATED'
  },

  // DADOS ESPECÍFICOS DA PRODUÇÃO
  // fabricType movido para productionType.fabricType (rotary) ou productionType.variants[].fabricType (localized)

  observations: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observations must have maximum 1000 characters']
  },

  // NOVOS CAMPOS - CRAFT E LARGURA DO TECIDO
  hasCraft: {
    type: Boolean,
    default: false
  },

  fabricWidth: {
    type: Number,
    min: [0, 'Fabric width must be positive'],
    max: [500, 'Fabric width must be reasonable']
  },

  // CONTROL FIELDS
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// VIRTUAL POPULATE - sempre inclui dados do development automaticamente
productionOrderSchema.virtual('development', {
  ref: 'Development',
  localField: 'developmentId',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos no JSON e Object, sem versionKey
productionOrderSchema.set('toJSON', { 
  virtuals: true,
  versionKey: false 
});
productionOrderSchema.set('toObject', { 
  virtuals: true,
  versionKey: false 
});

productionOrderSchema.pre('save', async function(next) {
  try {
    // Se não tiver productionType definido, buscar do development
    if (!this.productionType || !this.productionType.type) {
      const Development = mongoose.model('Development');
      const development = await Development.findById(this.developmentId);
      
      if (!development) {
        return next(new Error('Development not found'));
      }

      // Gerar estrutura padrão baseada no tipo do development
      if (development.productionType === 'rotary') {
        this.productionType = {
          type: 'rotary',
          meters: 0,
          fabricType: ''
        };
      } else if (development.productionType === 'localized') {
        this.productionType = {
          type: 'localized',
          variants: [
            {
              variantName: '',
              fabricType: '',
              quantities: [
                { size: 'PP', value: 0 },
                { size: 'P', value: 0 },
                { size: 'M', value: 0 },
                { size: 'G', value: 0 },
                { size: 'G1', value: 0 },
                { size: 'G2', value: 0 }
              ]
            }
          ]
        };
      }
    }

    // Validações específicas por tipo
    if (this.productionType.type === 'rotary') {
      if (!this.productionType.meters || this.productionType.meters < 0) {
        return next(new Error('Meters is required and must be positive for rotary production type'));
      }
      if (!this.productionType.fabricType || this.productionType.fabricType.trim() === '') {
        return next(new Error('Fabric type is required for rotary production type'));
      }
    }

    if (this.productionType.type === 'localized') {
      if (!this.productionType.variants || !Array.isArray(this.productionType.variants) || this.productionType.variants.length === 0) {
        return next(new Error('At least one variant is required for localized production type'));
      }

      // Validar cada variante
      for (let i = 0; i < this.productionType.variants.length; i++) {
        const variant = this.productionType.variants[i];
        
        if (!variant.variantName || variant.variantName.trim() === '') {
          return next(new Error(`Variant ${i + 1}: variant name is required`));
        }
        
        if (!variant.fabricType || variant.fabricType.trim() === '') {
          return next(new Error(`Variant ${i + 1}: fabric type is required`));
        }
        
        if (!variant.quantities || !Array.isArray(variant.quantities) || variant.quantities.length === 0) {
          return next(new Error(`Variant ${i + 1}: at least one quantity is required`));
        }

        // Quantidades são aceitas sem validação - aceitar qualquer valor do usuário
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para sempre popular development automaticamente
productionOrderSchema.pre(/^find/, function() {
  this.populate({
    path: 'development',
    select: 'clientId clientReference description pieceImage variants productionType status active',
    populate: {
      path: 'client',
      select: 'companyName cnpj contact values'
    }
  });
});

// Copy internalReference from Development before saving
productionOrderSchema.pre('save', async function(next) {
  if (this.isNew && this.developmentId) {
    try {
      const Development = mongoose.model('Development');
      const development = await Development.findById(this.developmentId);
      
      if (!development) {
        return next(new Error('Development not found'));
      }
      
      // Verificar se development está aprovado
      if (development.status !== 'APPROVED') {
        return next(new Error('Development must be approved to create production order'));
      }
      
      // Copiar internalReference do development
      this.internalReference = development.internalReference;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to get formatted status
productionOrderSchema.methods.getFormattedStatus = function() {
  const statusMap = {
    'CREATED': 'Criado',
    'PILOT_PRODUCTION': 'Produção do Piloto',
    'PILOT_SENT': 'Piloto Enviado',
    'PILOT_APPROVED': 'Piloto Aprovado',
    'PRODUCTION_STARTED': 'Produção Iniciada',
    'FINALIZED': 'Finalizado'
  };
  return statusMap[this.status] || this.status;
};

// Method to check if can be approved
productionOrderSchema.methods.canBeApproved = function() {
  return this.status === 'awaiting_approval';
};

// Method to check if can create production receipt
productionOrderSchema.methods.canCreateProductionReceipt = function() {
  return this.status === 'APPROVED';
};

// Static method to get production order statistics
productionOrderSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const statusResult = {
    total: 0,
    CREATED: 0,
    PILOT_PRODUCTION: 0,
    PILOT_SENT: 0,
    PILOT_APPROVED: 0,
    PRODUCTION_STARTED: 0,
    FINALIZED: 0
  };
  
  stats.forEach(stat => {
    statusResult[stat._id] = stat.count;
    statusResult.total += stat.count;
  });
  
  return {
    status: statusResult
  };
};

// Static method to get by development
productionOrderSchema.statics.getByDevelopment = async function(developmentId) {
  return await this.findOne({ 
    developmentId: developmentId,
    active: true 
  });
};

// Indexes for optimized search
productionOrderSchema.index({ internalReference: 1 });
productionOrderSchema.index({ developmentId: 1 });
productionOrderSchema.index({ status: 1 });
productionOrderSchema.index({ active: 1 });
productionOrderSchema.index({ createdAt: -1 });
productionOrderSchema.index({ fabricType: 'text', observations: 'text' });

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);