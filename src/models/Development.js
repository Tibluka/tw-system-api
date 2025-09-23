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

  // NOVO PRODUCTION TYPE - ESTRUTURA SIMPLIFICADA
  productionType: {
    type: {
      type: String,
      enum: ['rotary', 'localized'],
      required: [true, 'Production type is required']
    },
    meters: {
      type: Number,
      min: [0.1, 'Meters must be at least 0.1'],
      validate: {
        validator: function(value) {
          // Metros obrigatório apenas para rotary
          if (this.productionType?.type === 'rotary') {
            return value != null && value >= 0.1;
          }
          return true;
        },
        message: 'Meters is required for rotary production type'
      }
    },
    sizes: [{
      size: {
        type: String,
        required: [true, 'Size name is required'],
        trim: true,
        maxlength: [10, 'Size name must have maximum 10 characters']
      },
      value: {
        type: Number,
        required: [true, 'Size value is required'],
        min: [1, 'Size value must be at least 1']
      }
    }],
    // Validação customizada para sizes
    validate: {
      validator: function(productionType) {
        if (productionType.type === 'localized') {
          return productionType.sizes && productionType.sizes.length > 0;
        }
        return true;
      },
      message: 'Sizes array is required for localized production type'
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

// Validação customizada no pre-save para production type
developmentSchema.pre('save', function(next) {
  if (!this.productionType || !this.productionType.type) {
    return next(new Error('Production type is required'));
  }

  const { type, meters, sizes } = this.productionType;

  // Validar rotary
  if (type === 'rotary') {
    if (!meters || meters < 0.1) {
      return next(new Error('Meters is required and must be at least 0.1 for rotary production'));
    }
  }

  // Validar localized
  if (type === 'localized') {
    if (!sizes || sizes.length === 0) {
      return next(new Error('At least one size is required for localized production'));
    }

    // Validar cada size
    for (let sizeItem of sizes) {
      if (!sizeItem.size || !sizeItem.size.trim()) {
        return next(new Error('Size name is required'));
      }
      if (!sizeItem.value || sizeItem.value < 1) {
        return next(new Error('Size value must be at least 1'));
      }
    }

    // Validar nomes de tamanhos únicos
    const sizeNames = sizes.map(s => s.size.trim().toUpperCase());
    const uniqueSizeNames = [...new Set(sizeNames)];
    if (sizeNames.length !== uniqueSizeNames.length) {
      return next(new Error('Size names must be unique'));
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

// Method to get formatted production type
developmentSchema.methods.getFormattedProductionType = function() {
  if (!this.productionType?.type) return 'Não definido';
  
  const typeMap = {
    'rotary': 'Rotativa',
    'localized': 'Localizada'
  };
  
  return typeMap[this.productionType.type] || this.productionType.type;
};

// Method to get production summary
developmentSchema.methods.getProductionSummary = function() {
  if (!this.productionType) return 'Não definido';

  const { type, meters, sizes } = this.productionType;

  if (type === 'rotary') {
    return `${meters}m (Rotativa)`;
  }

  if (type === 'localized' && sizes) {
    const totalPieces = sizes.reduce((sum, item) => sum + item.value, 0);
    const sizesList = sizes.map(item => `${item.size}: ${item.value}`).join(', ');
    return `${totalPieces} peças (${sizesList})`;
  }

  return 'Não definido';
};

// Method to check if can be approved
developmentSchema.methods.canBeApproved = function() {
  return this.status === 'AWAITING_APPROVAL';
};

// Method to check if can create production order
developmentSchema.methods.canCreateProductionOrder = function() {
  return this.status === 'APPROVED';
};

// Static method to get development statistics
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
        _id: '$productionType.type',
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

// Indexes for optimized search
developmentSchema.index({ internalReference: 1 });
developmentSchema.index({ clientId: 1 });
developmentSchema.index({ status: 1 });
developmentSchema.index({ 'productionType.type': 1 });
developmentSchema.index({ active: 1 });
developmentSchema.index({ createdAt: -1 });
developmentSchema.index({ 'clientReference': 'text', 'description': 'text' });

module.exports = mongoose.model('Development', developmentSchema);