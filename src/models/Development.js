const mongoose = require('mongoose');

const developmentSchema = new mongoose.Schema({
  // IDENTIFIERS
  clientReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Client reference must have maximum 100 characters']
  },
  internalReference: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Internal reference must have maximum 20 characters']
  },
  // CLIENT REFERENCE (apenas a referência, sem duplicação)
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required']
  },
  // BASIC DATA
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description must have maximum 500 characters']
  },
  pieceImage: {
    type: String, // Image URL
    trim: true
  },
  // STATUS
  status: {
    type: String,
    enum: ['CREATED', 'AWAITING_APPROVAL', 'APPROVED', 'CLOSED'],
    default: 'CREATED'
  },
  // VARIANTS
  variants: {
    color: {
      type: String,
      trim: true,
      maxlength: [50, 'Color must have maximum 50 characters']
    }
  },
  // PRODUCTION TYPE
  productionType: {
    rotary: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      negotiatedPrice: { 
        type: Number, 
        min: [0, 'Negotiated price must be positive'],
        validate: {
          validator: function(v) {
            // Se rotary está habilitado, deve ter preço
            if (this.productionType.rotary.enabled && !v) {
              return false;
            }
            return true;
          },
          message: 'Negotiated price is required when rotary is enabled'
        }
      }
    },
    localized: {
      enabled: { 
        type: Boolean, 
        default: false 
      },
      sizes: {
        xs: { type: Number, default: 0, min: 0 },
        s: { type: Number, default: 0, min: 0 },
        m: { type: Number, default: 0, min: 0 },
        l: { type: Number, default: 0, min: 0 },
        xl: { type: Number, default: 0, min: 0 }
      }
    }
  },
  // CONTROL FIELDS
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// VIRTUAL POPULATE - sempre inclui dados do cliente automaticamente
developmentSchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos no JSON e Object
developmentSchema.set('toJSON', { 
  virtuals: true,
  versionKey: false 
});
developmentSchema.set('toObject', { 
  virtuals: true,
  versionKey: false 
});

// Middleware para sempre popular cliente automaticamente
developmentSchema.pre(/^find/, function() {
  this.populate({
    path: 'client',
    select: 'companyName cnpj contact values active'
  });
});

// Generate internal reference before saving
developmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.internalReference) {
    try {
      // Get current year (last 2 digits)
      const year = new Date().getFullYear().toString().slice(-2);
      
      // Get client data to get the acronym
      const client = await mongoose.model('Client').findById(this.clientId);
      if (!client) {
        throw new Error('Client not found');
      }
      
      // Use client's acronym
      const clientAcronym = client.acronym;
      
      // Get the highest sequential number for this client this year
      const lastDevelopment = await this.constructor
        .findOne({ 
          clientId: this.clientId,
          internalReference: new RegExp(`^${year}${clientAcronym}\\d{4}$`),
          active: true
        })
        .sort({ internalReference: -1 });
      
      let sequential = 1;
      if (lastDevelopment) {
        // Extract the sequential number from the last reference
        const lastSequential = parseInt(lastDevelopment.internalReference.slice(-4));
        sequential = lastSequential + 1;
      }
      
      // Format with 4 digits: 0001, 0002, etc.
      const sequentialFormatted = sequential.toString().padStart(4, '0');
      
      // Final format: 25ABC0001
      this.internalReference = `${year}${clientAcronym}${sequentialFormatted}`;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Validation: at least one production type must be enabled
developmentSchema.pre('save', function(next) {
  const { rotary, localized } = this.productionType;
  
  if (!rotary.enabled && !localized.enabled) {
    return next(new Error('At least one production type must be enabled'));
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

// Method to check if can be approved
developmentSchema.methods.canBeApproved = function() {
  return this.status === 'awaiting_approval';
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
  
  const result = {
    total: 0,
    started: 0,
    awaiting_approval: 0,
    approved: 0,
    refused: 0
  };
  
  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });
  
  return result;
};

// Indexes for optimized search
developmentSchema.index({ internalReference: 1 });
developmentSchema.index({ clientId: 1 });
developmentSchema.index({ status: 1 });
developmentSchema.index({ active: 1 });
developmentSchema.index({ createdAt: -1 });
developmentSchema.index({ 'clientReference': 'text', 'description': 'text' });

module.exports = mongoose.model('Development', developmentSchema);