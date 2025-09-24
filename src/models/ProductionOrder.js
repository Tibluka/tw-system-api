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
    meters: {
      type: Number,
      min: [0, 'Meters must be positive']
    },
    additionalInfo: {
      variant: {
        type: String,
        trim: true,
        maxlength: [100, 'Variant must have maximum 100 characters']
      },
      sizes: [{
        size: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
          enum: ['PP', 'P', 'M', 'G', 'G1', 'G2']
        },
        value: {
          type: Number,
          required: true,
          min: [0, 'Size value must be positive']
        }
      }]
    }
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
  fabricType: {
    type: String,
    required: [true, 'Fabric type is required'],
    trim: true,
    maxlength: [100, 'Fabric type must have maximum 100 characters']
  },

  observations: {
    type: String,
    trim: true,
    maxlength: [1000, 'Observations must have maximum 1000 characters']
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

productionOrderSchema.pre('save', function(next) {
  if (this.productionType) {
    if (this.productionType.type === 'rotary') {
      if (this.productionType.meters === undefined || this.productionType.meters < 0) {
        return next(new Error('Meters is required and must be positive for rotary production type'));
      }
    }

    if (this.productionType.type === 'localized') {
      if (!this.productionType.additionalInfo) {
        return next(new Error('Additional info is required for localized production type'));
      }
      
      if (this.productionType.additionalInfo.variant === undefined) {
        return next(new Error('Variant is required in additional info for localized production type'));
      }
    }
  }
  next();
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