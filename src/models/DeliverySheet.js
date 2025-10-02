const mongoose = require('mongoose');

const deliverySheetSchema = new mongoose.Schema({
  // REFERÊNCIA INTERNA ÚNICA
  internalReference: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Internal reference must have maximum 20 characters']
  },

  // REFERÊNCIA À FICHA DE PRODUÇÃO (usando internalReference)
  productionSheetInternalReference: {
    type: String,
    trim: true,
    uppercase: true
  },

  // REFERÊNCIA À FICHA DE PRODUÇÃO (ObjectId para populate)
  productionSheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionSheet'
  },

  // DATA DE ENTREGA
  deliveryDate: {
    type: Date
  },

  // VALOR TOTAL DA ENTREGA
  totalValue: {
    type: Number,
    required: [true, 'Total value is required'],
    min: [0, 'Total value must be positive']
  },

  // NOTAS
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes must have maximum 1000 characters']
  },

  // NOTA FISCAL
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true,
    maxlength: [50, 'Invoice number must have maximum 50 characters']
  },

  // ENDEREÇO DE ENTREGA
  address: {
    street: {
      type: String,
      required: [true, 'Street is required'],
      trim: true,
      maxlength: [200, 'Street must have maximum 200 characters']
    },
    number: {
      type: String,
      required: [true, 'Number is required'],
      trim: true,
      maxlength: [20, 'Number must have maximum 20 characters']
    },
    complement: {
      type: String,
      trim: true,
      maxlength: [100, 'Complement must have maximum 100 characters']
    },
    neighborhood: {
      type: String,
      required: [true, 'Neighborhood is required'],
      trim: true,
      maxlength: [100, 'Neighborhood must have maximum 100 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City must have maximum 100 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [2, 'State must have exactly 2 characters'],
      uppercase: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [10, 'ZIP code must have maximum 10 characters']
    }
  },

  // STATUS DA ENTREGA
  status: {
    type: String,
    enum: ['CREATED', 'ON_ROUTE', 'DELIVERED'],
    default: 'CREATED'
  },

  // DADOS DE CONTROLE
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// MIDDLEWARE PRE-SAVE PARA GERAR INTERNAL REFERENCE (DESABILITADO - USANDO CONTROLLER)
// deliverySheetSchema.pre('save', async function(next) {
//   // Lógica movida para o controller
//   next();
// });

// ÍNDICES
deliverySheetSchema.index({ internalReference: 1 });
deliverySheetSchema.index({ productionSheetId: 1 });
deliverySheetSchema.index({ deliveryDate: 1 });
deliverySheetSchema.index({ status: 1 });
deliverySheetSchema.index({ active: 1 });

module.exports = mongoose.model('DeliverySheet', deliverySheetSchema);
