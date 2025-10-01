const mongoose = require('mongoose');

const productionSheetSchema = new mongoose.Schema({
  // PRODUCTION ORDER REFERENCE (virtual populate para dados completos)
  productionOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionOrder',
    required: [true, 'Production order is required']
  },

  // DADOS COPIADOS (para não depender de populate)
  internalReference: {
    type: String,
    // required será preenchido automaticamente pelo middleware
    trim: true,
    uppercase: true,
    maxlength: [20, 'Internal reference must have maximum 20 characters']
  },

  // DADOS OPERACIONAIS ESPECÍFICOS
  entryDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Entry date is required']
  },

  expectedExitDate: {
    type: Date,
    required: [true, 'Expected exit date is required']
  },

  machine: {
    type: Number,
    required: [true, 'Machine is required'],
    enum: [1, 2, 3, 4],
    validate: {
      validator: function(v) {
        return [1, 2, 3, 4].includes(v);
      },
      message: 'Machine must be 1, 2, 3, or 4'
    }
  },

  // ETAPAS OPERACIONAIS
  stage: {
    type: String,
    enum: ['PRINTING', 'CALENDERING', 'FINISHED'],
    default: 'PRINTING'
  },

  // OBSERVAÇÕES ESPECÍFICAS DA PRODUÇÃO
  productionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Production notes must have maximum 1000 characters']
  },

  // PARÂMETROS DE PRODUÇÃO
  temperature: {
    type: Number,
    min: [0, 'Temperature must be positive'],
    max: [500, 'Temperature must be reasonable']
  },

  velocity: {
    type: Number,
    min: [0, 'Velocity must be positive'],
    max: [1000, 'Velocity must be reasonable']
  },

  // CONTROL FIELDS
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// VIRTUAL POPULATE - sempre inclui dados da production order automaticamente
productionSheetSchema.virtual('productionOrder', {
  ref: 'ProductionOrder',
  localField: 'productionOrderId',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos no JSON e Object, sem versionKey
productionSheetSchema.set('toJSON', { 
  virtuals: true,
  versionKey: false 
});
productionSheetSchema.set('toObject', { 
  virtuals: true,
  versionKey: false 
});

// Middleware para sempre popular production order automaticamente
productionSheetSchema.pre(/^find/, function() {
  this.populate({
    path: 'productionOrder',
    select: 'developmentId internalReference status fabricType observations productionType active',
    populate: {
      path: 'development',
      select: 'clientId clientReference description pieceImage variants productionType status',
      populate: {
        path: 'client',
        select: 'companyName cnpj contact values'
      }
    }
  });
});

// Copy internalReference from ProductionOrder before saving
productionSheetSchema.pre('save', async function(next) {
  if (this.isNew && this.productionOrderId) {
    try {
      const ProductionOrder = mongoose.model('ProductionOrder');
      const productionOrder = await ProductionOrder.findById(this.productionOrderId);
      
      if (!productionOrder) {
        return next(new Error('Production order not found'));
      }
      
      // Copiar internalReference da production order
      this.internalReference = productionOrder.internalReference;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to get formatted stage
productionSheetSchema.methods.getFormattedStage = function() {
  const stageMap = {
    'PRINTING': 'Impressão',
    'CALENDERING': 'Calandra',
    'FINISHED': 'Finalizado'
  };
  return stageMap[this.stage] || this.stage;
};

// Method to get machine name
productionSheetSchema.methods.getMachineName = function() {
  return `Máquina ${this.machine}`;
};

// Method to check if production is finished
productionSheetSchema.methods.isFinished = function() {
  return this.stage === 'FINISHED';
};

// Method to advance to next stage
productionSheetSchema.methods.advanceStage = function() {
  const stageOrder = ['PRINTING', 'CALENDERING', 'FINISHED'];
  const currentIndex = stageOrder.indexOf(this.stage);
  
  if (currentIndex < stageOrder.length - 1) {
    this.stage = stageOrder[currentIndex + 1];
    return true;
  }
  return false; // Already at final stage
};

// Static method to get production sheet statistics
productionSheetSchema.statics.getStatistics = async function() {
  const stageStats = await this.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const machineStats = await this.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$machine',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const stageResult = {
    total: 0,
    printing: 0,
    calendering: 0,
    finished: 0
  };
  
  const machineResult = {
    machine1: 0,
    machine2: 0,
    machine3: 0,
    machine4: 0
  };
  
  stageStats.forEach(stat => {
    stageResult[stat._id] = stat.count;
    stageResult.total += stat.count;
  });
  
  machineStats.forEach(stat => {
    machineResult[`machine${stat._id}`] = stat.count;
  });
  
  return {
    stages: stageResult,
    machines: machineResult
  };
};

// Static method to get by production order
productionSheetSchema.statics.getByProductionOrder = async function(productionOrderId) {
  return await this.findOne({ 
    productionOrderId: productionOrderId,
    active: true 
  });
};

// Static method to get by machine
productionSheetSchema.statics.getByMachine = async function(machineNumber) {
  return await this.find({ 
    machine: machineNumber,
    active: true,
    stage: { $ne: 'FINISHED' } // Excluir finalizados
  }).sort({ entryDate: 1 });
};

// Indexes for optimized search
productionSheetSchema.index({ internalReference: 1 });
productionSheetSchema.index({ productionOrderId: 1 });
productionSheetSchema.index({ stage: 1 });
productionSheetSchema.index({ machine: 1 });
productionSheetSchema.index({ entryDate: 1 });
productionSheetSchema.index({ expectedExitDate: 1 });
productionSheetSchema.index({ active: 1 });
productionSheetSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProductionSheet', productionSheetSchema);