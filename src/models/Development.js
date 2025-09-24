const mongoose = require('mongoose');

const developmentSchema = new mongoose.Schema({
  // CLIENT REFERENCE (virtual populate para dados completos)
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },

  // DADOS COPIADOS (para não depender de populate)
  internalReference: {
    type: String,
    // required será preenchido automaticamente pelo middleware
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true,
    maxlength: [20, 'Internal reference must have maximum 20 characters']
  },

  // DADOS ESPECÍFICOS DO DESENVOLVIMENTO
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must have maximum 500 characters']
  },

  clientReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Client reference must have maximum 100 characters']
  },

  // IMAGEM DA PEÇA
  pieceImage: {
    url: { type: String, trim: true },
    publicId: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now }
  },

  // VARIANTES (cores, etc)
  variants: {
    color: {
      type: String,
      trim: true,
      maxlength: [50, 'Color must have maximum 50 characters']
    }
  },

  // PRODUCTION TYPE - NOVA ESTRUTURA COM OBJETO COMPLETO
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

  // STATUS DO DESENVOLVIMENTO
  status: {
    type: String,
    enum: ['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CANCELED'],
    default: 'CREATED'
  },

  // CONTROL FIELDS
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// VIRTUAL POPULATE - sempre inclui dados do client automaticamente
developmentSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos no JSON e Object, sem versionKey
developmentSchema.set('toJSON', { 
  virtuals: true,
  versionKey: false 
});
developmentSchema.set('toObject', { 
  virtuals: true,
  versionKey: false 
});

// Middleware de validação customizada - ADICIONADO
developmentSchema.pre('save', function(next) {
  // Validar estrutura do productionType
  if (this.productionType) {
    if (this.productionType.type === 'rotary') {
      // Para rotary, meters é obrigatório
      if (this.productionType.meters === undefined || this.productionType.meters < 0) {
        return next(new Error('Meters is required and must be positive for rotary production type'));
      }
    }

    if (this.productionType.type === 'localized') {
      // Para localized, additionalInfo é obrigatório
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

// Middleware para sempre popular client automaticamente
developmentSchema.pre(/^find/, function() {
  this.populate({
    path: 'client',
    select: 'companyName cnpj contact values acronym'
  });
});

// Generate unique internalReference before saving
developmentSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Client = mongoose.model('Client');
      const client = await Client.findById(this.clientId);
      
      if (!client) {
        return next(new Error('Client not found'));
      }
      
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const clientAcronym = client.acronym || 'DEF';
      
      // Find the last development for this year and client
      const lastDevelopment = await this.constructor.findOne({
        internalReference: new RegExp(`^${currentYear}${clientAcronym}\\d{4}$`)
      }).sort({ internalReference: -1 });
      
      let sequential = 1;
      if (lastDevelopment && lastDevelopment.internalReference) {
        const lastSequential = parseInt(lastDevelopment.internalReference.slice(-4));
        sequential = lastSequential + 1;
      }
      
      const sequentialFormatted = sequential.toString().padStart(4, '0');
      
      // Final format: 25ABC0001
      this.internalReference = `${currentYear}${clientAcronym}${sequentialFormatted}`;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to get formatted status
developmentSchema.methods.getFormattedStatus = function() {
  const statusMap = {
    'CREATED': 'Criado',
    'AWAITING_APPROVAL': 'Aguardando Aprovação',
    'APPROVED': 'Aprovado',
    'CANCELED': 'Cancelado'
  };
  return statusMap[this.status] || this.status;
};

// Method to get formatted production type - ATUALIZADO
developmentSchema.methods.getFormattedProductionType = function() {
  const typeMap = {
    'rotary': 'Rotativa',
    'localized': 'Localizada'
  };
  return typeMap[this.productionType.type] || this.productionType.type;
};

// Method to check if can be approved
developmentSchema.methods.canBeApproved = function() {
  return this.status === 'AWAITING_APPROVAL';
};

// Method to check if can create production order
developmentSchema.methods.canCreateProductionOrder = function() {
  return this.status === 'APPROVED';
};

// Static method to get development statistics - ATUALIZADO
developmentSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const productionTypeStats = await this.aggregate([
    {
      $group: {
        _id: '$productionType.type', // MUDANÇA: agora acessa productionType.type
        count: { $sum: 1 }
      }
    }
  ]);
  
  const statusResult = {
    total: 0,
    CREATED: 0,
    AWAITING_APPROVAL: 0,
    APPROVED: 0,
    CANCELED: 0
  };

  const productionTypeResult = {
    rotary: 0,
    localized: 0
  };
  
  stats.forEach(stat => {
    if (stat._id) {
      statusResult[stat._id] = stat.count;
      statusResult.total += stat.count;
    }
  });

  productionTypeStats.forEach(stat => {
    if (stat._id) {
      productionTypeResult[stat._id] = stat.count;
    }
  });
  
  return {
    status: statusResult,
    productionType: productionTypeResult
  };
};

// Indexes for optimized search - ATUALIZADO
developmentSchema.index({ internalReference: 1 });
developmentSchema.index({ clientId: 1 });
developmentSchema.index({ status: 1 });
developmentSchema.index({ 'productionType.type': 1 }); // MUDANÇA: agora indexa productionType.type
developmentSchema.index({ active: 1 });
developmentSchema.index({ createdAt: -1 });
developmentSchema.index({ 'clientReference': 'text', 'description': 'text' });

module.exports = mongoose.model('Development', developmentSchema);