const mongoose = require('mongoose');

const productionReceiptSchema = new mongoose.Schema({
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

  // DADOS FINANCEIROS
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'],
    trim: true
  },

  // STATUS DO PAGAMENTO
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID'],
    default: 'PENDING'
  },

  // VALORES
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount must be positive']
  },

  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount must be positive'],
    validate: {
      validator: function(v) {
        return v <= this.totalAmount;
      },
      message: 'Paid amount cannot be greater than total amount'
    }
  },

  remainingAmount: {
    type: Number,
    default: function() {
      return this.totalAmount - this.paidAmount;
    }
  },

  // DATAS
  issueDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Issue date is required']
  },

  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },

  paymentDate: {
    type: Date,
    validate: {
      validator: function(v) {
        // Se status é PAID, deve ter data de pagamento
        if (this.paymentStatus === 'PAID' && !v) {
          return false;
        }
        return true;
      },
      message: 'Payment date is required when status is PAID'
    }
  },

  // OBSERVAÇÕES
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must have maximum 1000 characters']
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
productionReceiptSchema.virtual('productionOrder', {
  ref: 'ProductionOrder',
  localField: 'productionOrderId',
  foreignField: '_id',
  justOne: true
});

// Garantir que virtuals sejam incluídos no JSON e Object, sem versionKey
productionReceiptSchema.set('toJSON', { 
  virtuals: true,
  versionKey: false 
});
productionReceiptSchema.set('toObject', { 
  virtuals: true,
  versionKey: false 
});

// Middleware para sempre popular production order automaticamente
productionReceiptSchema.pre(/^find/, function() {
  this.populate({
    path: 'productionOrder',
    select: 'developmentId internalReference status fabricType pilot observations priority active',
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
productionReceiptSchema.pre('save', async function(next) {
  if (this.isNew && this.productionOrderId) {
    try {
      const ProductionOrder = mongoose.model('ProductionOrder');
      const productionOrder = await ProductionOrder.findById(this.productionOrderId);
      
      if (!productionOrder) {
        return next(new Error('Production order not found'));
      }
      
      // Verificar se production order está finalizada
      if (productionOrder.status !== 'FINALIZED') {
        return next(new Error('Production order must be finalized to create production receipt'));
      }
      
      // Copiar internalReference da production order
      this.internalReference = productionOrder.internalReference;
      
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Update remainingAmount before saving
productionReceiptSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  // Se valor pago = total, marcar como PAID
  if (this.paidAmount >= this.totalAmount && this.paymentStatus !== 'PAID') {
    this.paymentStatus = 'PAID';
    if (!this.paymentDate) {
      this.paymentDate = new Date();
    }
  }
  
  // Se valor pago < total, marcar como PENDING
  if (this.paidAmount < this.totalAmount && this.paymentStatus === 'PAID') {
    this.paymentStatus = 'PENDING';
    this.paymentDate = undefined;
  }
  
  next();
});

// Method to get formatted payment method
productionReceiptSchema.methods.getFormattedPaymentMethod = function() {
  const methodMap = {
    'CASH': 'Dinheiro',
    'CREDIT_CARD': 'Cartão de Crédito',
    'DEBIT_CARD': 'Cartão de Débito',
    'BANK_TRANSFER': 'Transferência Bancária',
    'PIX': 'PIX',
    'CHECK': 'Cheque'
  };
  return methodMap[this.paymentMethod] || this.paymentMethod;
};

// Method to get formatted payment status
productionReceiptSchema.methods.getFormattedPaymentStatus = function() {
  const statusMap = {
    'PENDING': 'Pendente',
    'PAID': 'Pago'
  };
  return statusMap[this.paymentStatus] || this.paymentStatus;
};

// Method to check if payment is overdue
productionReceiptSchema.methods.isOverdue = function() {
  if (this.paymentStatus === 'PAID') return false;
  return new Date() > this.dueDate;
};

// Method to get days overdue
productionReceiptSchema.methods.getDaysOverdue = function() {
  if (!this.isOverdue()) return 0;
  const diffTime = new Date() - this.dueDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to process payment
productionReceiptSchema.methods.processPayment = function(amount, paymentDate = new Date()) {
  if (this.paymentStatus === 'PAID') {
    throw new Error('Payment already completed');
  }
  
  const newPaidAmount = this.paidAmount + amount;
  if (newPaidAmount > this.totalAmount) {
    throw new Error('Payment amount exceeds remaining balance');
  }
  
  this.paidAmount = newPaidAmount;
  this.remainingAmount = this.totalAmount - this.paidAmount;
  
  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'PAID';
    this.paymentDate = paymentDate;
  }
  
  return this;
};

// Static method to get production receipt statistics
productionReceiptSchema.statics.getStatistics = async function() {
  const statusStats = await this.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' }
      }
    }
  ]);
  
  const methodStats = await this.aggregate([
    { $match: { active: true, paymentStatus: 'PAID' } },
    {
      $group: {
        _id: '$paymentMethod',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  // Calcular recibos em atraso
  const overdueCount = await this.countDocuments({
    active: true,
    paymentStatus: 'PENDING',
    dueDate: { $lt: new Date() }
  });
  
  const statusResult = {
    total: 0,
    totalAmount: 0,
    paidAmount: 0,
    PENDING: { count: 0, totalAmount: 0, paidAmount: 0 },
    PAID: { count: 0, totalAmount: 0, paidAmount: 0 }
  };
  
  const methodResult = {};
  
  statusStats.forEach(stat => {
    statusResult[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount,
      paidAmount: stat.paidAmount
    };
    statusResult.total += stat.count;
    statusResult.totalAmount += stat.totalAmount;
    statusResult.paidAmount += stat.paidAmount;
  });
  
  methodStats.forEach(stat => {
    methodResult[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount
    };
  });
  
  return {
    status: statusResult,
    paymentMethods: methodResult,
    overdue: overdueCount
  };
};

// Static method to get by production order
productionReceiptSchema.statics.getByProductionOrder = async function(productionOrderId) {
  return await this.findOne({ 
    productionOrderId: productionOrderId,
    active: true 
  });
};

// Indexes for optimized search
productionReceiptSchema.index({ internalReference: 1 });
productionReceiptSchema.index({ productionOrderId: 1 });
productionReceiptSchema.index({ paymentStatus: 1 });
productionReceiptSchema.index({ paymentMethod: 1 });
productionReceiptSchema.index({ issueDate: -1 });
productionReceiptSchema.index({ dueDate: 1 });
productionReceiptSchema.index({ active: 1 });
productionReceiptSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProductionReceipt', productionReceiptSchema);