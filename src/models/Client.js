const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Razão social é obrigatória'],
    trim: true,
    maxlength: [200, 'Razão social deve ter no máximo 200 caracteres']
  },
  cnpj: {
    type: String,
    required: [true, 'CNPJ é obrigatório'],
    unique: true,
    validate: {
      validator: function(v) {
        // Validação básica de CNPJ (apenas números e 14 dígitos)
        return /^\d{14}$/.test(v.replace(/[^\d]/g, ''));
      },
      message: 'CNPJ deve conter 14 dígitos'
    }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Telefone é obrigatório'],
      validate: {
        validator: function(v) {
          return /^[\d\s\(\)\-\+]+$/.test(v);
        },
        message: 'Formato de phone inválido'
      }
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Email deve ter um formato válido'
      }
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Logradouro é obrigatório'],
      trim: true
    },
    number: {
      type: String,
      required: [true, 'Número é obrigatório'],
      trim: true
    },
    complement: {
      type: String,
      trim: true
    },
    neighborhood: {
      type: String,
      required: [true, 'Bairro é obrigatório'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Cidade é obrigatória'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Estado é obrigatório'],
      trim: true,
      maxlength: [2, 'Estado deve ter 2 caracteres']
    },
    zipcode: {
      type: String,
      required: [true, 'CEP é obrigatório'],
      validate: {
        validator: function(v) {
          return /^\d{5}-?\d{3}$/.test(v);
        },
        message: 'CEP deve ter formato válido (12345-678)'
      }
    }
  },
  values: {
    valuePerMeter: {
      type: Number,
      required: [true, 'Valor por metro é obrigatório'],
      min: [0, 'Valor por metro deve ser positivo']
    },
    valuePerPiece: {
      type: Number,
      required: [true, 'Valor por peça é obrigatório'],
      min: [0, 'Valor por peça deve ser positivo']
    }
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Middleware para formatar CNPJ antes de salvar
clientSchema.pre('save', function(next) {
  if (this.cnpj) {
    this.cnpj = this.cnpj.replace(/[^\d]/g, '');
  }
  if (this.address && this.address.zipcode) {
    this.address.zipcode = this.address.zipcode.replace(/[^\d]/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  next();
});

// Método para formatar CNPJ na exibição
clientSchema.methods.formatCNPJ = function() {
  return this.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Método para obter endereço completo
clientSchema.methods.getEnderecoCompleto = function() {
  const { street, number, complement, neighborhood, city, state, zipcode } = this.address;
  let enderecoCompleto = `${street}, ${number}`;
  if (complement) enderecoCompleto += ` - ${complement}`;
  enderecoCompleto += ` - ${neighborhood}, ${city}/${state} - ${zipcode}`;
  return enderecoCompleto;
};

// Index para busca otimizada
clientSchema.index({ companyName: 'text', 'contact.email': 'text' });
clientSchema.index({ cnpj: 1 });
clientSchema.index({ active: 1 });

module.exports = mongoose.model('Client', clientSchema);