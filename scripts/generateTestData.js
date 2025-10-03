const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Client = require('../src/models/Client');
const Development = require('../src/models/Development');
const ProductionOrder = require('../src/models/ProductionOrder');
const ProductionSheet = require('../src/models/ProductionSheet');
const DeliverySheet = require('../src/models/DeliverySheet');
const ProductionReceipt = require('../src/models/ProductionReceipt');

// Dados de exemplo
const sampleClients = [
  {
    acronym: 'ABC',
    companyName: 'ABC Têxtil Ltda',
    cnpj: '12.345.678/0001-90',
    contact: {
      responsibleName: 'João Silva',
      phone: '(11) 99999-9999',
      email: 'joao@abctextil.com'
    },
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Sala 101',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipcode: '01234-567'
    },
    values: {
      valuePerMeter: 15.50
    }
  },
  {
    acronym: 'XYZ',
    companyName: 'XYZ Confecções S.A.',
    cnpj: '98.765.432/0001-10',
    contact: {
      responsibleName: 'Maria Santos',
      phone: '(21) 88888-8888',
      email: 'maria@xyzconfeccoes.com'
    },
    address: {
      street: 'Avenida Brasil',
      number: '456',
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipcode: '22000-000'
    },
    values: {
      valuePerMeter: 22.30
    }
  },
  {
    acronym: 'DEF',
    companyName: 'DEF Moda Ltda',
    cnpj: '11.222.333/0001-44',
    contact: {
      responsibleName: 'Carlos Oliveira',
      phone: '(31) 77777-7777',
      email: 'carlos@defmoda.com'
    },
    address: {
      street: 'Rua da Liberdade',
      number: '789',
      neighborhood: 'Savassi',
      city: 'Belo Horizonte',
      state: 'MG',
      zipcode: '30112-000'
    },
    values: {
      valuePerMeter: 18.75
    }
  }
];

const sampleDevelopments = [
  {
    name: 'Coleção Verão 2025',
    description: 'Linha de camisetas básicas para o verão',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-03-15'),
    notes: 'Foco em cores vibrantes e tecidos leves'
  },
  {
    name: 'Coleção Inverno 2025',
    description: 'Linha de moletons e casacos',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-06-20'),
    notes: 'Tecidos mais pesados e cores escuras'
  },
  {
    name: 'Linha Esportiva',
    description: 'Roupas esportivas e fitness',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-04-10'),
    notes: 'Tecidos com tecnologia dry-fit'
  },
  {
    name: 'Coleção Kids',
    description: 'Roupas infantis coloridas',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-05-30'),
    notes: 'Cores alegres e estampas divertidas'
  },
  {
    name: 'Linha Plus Size',
    description: 'Roupas para tamanhos maiores',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'LOW',
    estimatedDeliveryDate: new Date('2025-07-15'),
    notes: 'Cortes especiais e conforto'
  },
  {
    name: 'Coleção Praia',
    description: 'Biquínis, maiôs e shorts de praia',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-02-28'),
    notes: 'Tecidos resistentes ao cloro e sal'
  },
  {
    name: 'Linha Masculina',
    description: 'Camisas, calças e blazers masculinos',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-08-20'),
    notes: 'Cortes clássicos e modernos'
  },
  {
    name: 'Coleção Festa',
    description: 'Vestidos e ternos para ocasiões especiais',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-12-15'),
    notes: 'Tecidos nobres e acabamentos especiais'
  },
  {
    name: 'Linha Casual',
    description: 'Roupas do dia a dia',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-09-10'),
    notes: 'Conforto e praticidade'
  },
  {
    name: 'Coleção Trabalho',
    description: 'Roupas corporativas e executivas',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-10-05'),
    notes: 'Elegância e profissionalismo'
  },
  {
    name: 'Linha Jeans',
    description: 'Calças, jaquetas e shorts jeans',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-11-20'),
    notes: 'Denim de qualidade premium'
  },
  {
    name: 'Coleção Noite',
    description: 'Roupas para eventos noturnos',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'LOW',
    estimatedDeliveryDate: new Date('2025-12-30'),
    notes: 'Glamour e sofisticação'
  },
  {
    name: 'Linha Básica',
    description: 'Camisetas, regatas e shorts básicos',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'HIGH',
    estimatedDeliveryDate: new Date('2025-01-25'),
    notes: 'Essenciais do guarda-roupa'
  },
  {
    name: 'Coleção Sustentável',
    description: 'Roupas com tecidos ecológicos',
    productionType: 'localized',
    status: 'APPROVED',
    priority: 'MEDIUM',
    estimatedDeliveryDate: new Date('2025-04-30'),
    notes: 'Consciência ambiental e moda responsável'
  },
  {
    name: 'Linha Acessórios',
    description: 'Bolsas, cintos e acessórios',
    productionType: 'rotary',
    status: 'APPROVED',
    priority: 'LOW',
    estimatedDeliveryDate: new Date('2025-06-15'),
    notes: 'Complementos para as coleções'
  }
];

const machines = [1, 2, 3, 4];
const stages = ['PRINTING', 'CALENDERING', 'FINISHED'];
const statuses = ['CREATED', 'PILOT_PRODUCTION', 'PILOT_SENT', 'PILOT_APPROVED', 'PRODUCTION_STARTED', 'FINALIZED'];
const deliveryStatuses = ['CREATED', 'ON_ROUTE', 'DELIVERED'];

// Função para gerar data aleatória
function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Função para gerar internal reference
function generateInternalReference(prefix, counter) {
  const year = new Date().getFullYear().toString().slice(-2);
  const number = counter.toString().padStart(4, '0');
  return `${prefix}${year}${number}`;
}

// Função para gerar dados de teste
async function generateTestData() {
  try {
    console.log('🚀 Iniciando geração de dados de teste...');

    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Limpar dados existentes (opcional)
    console.log('🧹 Limpando dados existentes...');
    await Client.deleteMany({});
    await Development.deleteMany({});
    await ProductionOrder.deleteMany({});
    await ProductionSheet.deleteMany({});
    await DeliverySheet.deleteMany({});
    await ProductionReceipt.deleteMany({});

    // Criar clientes
    console.log('👥 Criando clientes...');
    const clients = await Client.insertMany(sampleClients);
    console.log(`✅ ${clients.length} clientes criados`);

    // Criar desenvolvimentos
    console.log('🎨 Criando desenvolvimentos...');
    const developments = [];
    for (let i = 0; i < sampleDevelopments.length; i++) {
      const dev = new Development({
        ...sampleDevelopments[i],
        clientId: clients[i % clients.length]._id
      });
      await dev.save();
      developments.push(dev);
    }
    console.log(`✅ ${developments.length} desenvolvimentos criados`);

    // Criar ordens de produção
    console.log('📋 Criando ordens de produção...');
    const productionOrders = [];
    for (let i = 0; i < developments.length; i++) {
      const development = developments[i];
      
      let productionType;
      if (development.productionType === 'rotary') {
        productionType = {
          type: 'rotary',
          meters: Math.floor(Math.random() * 1000) + 100,
          fabricType: ['algodão', 'poliéster', 'viscose', 'linho'][Math.floor(Math.random() * 4)]
        };
      } else {
        const variants = [];
        const variantCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < variantCount; j++) {
          variants.push({
            variantName: `VARIANTE_${j + 1}`,
            fabricType: ['algodão', 'poliéster', 'viscose', 'linho'][Math.floor(Math.random() * 4)],
            quantities: [
              { size: 'PP', value: Math.floor(Math.random() * 50) },
              { size: 'P', value: Math.floor(Math.random() * 100) },
              { size: 'M', value: Math.floor(Math.random() * 150) },
              { size: 'G', value: Math.floor(Math.random() * 120) },
              { size: 'G1', value: Math.floor(Math.random() * 80) },
              { size: 'G2', value: Math.floor(Math.random() * 60) }
            ]
          });
        }
        productionType = {
          type: 'localized',
          variants: variants
        };
      }

      const productionOrder = new ProductionOrder({
        developmentId: development._id,
        productionType: productionType,
        hasCraft: Math.random() > 0.5,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: development.priority,
        estimatedStartDate: getRandomDate(new Date('2025-01-01'), new Date('2025-06-01')),
        estimatedEndDate: getRandomDate(new Date('2025-06-01'), new Date('2025-12-31')),
        notes: `Ordem de produção para ${development.name}`
      });

      await productionOrder.save();
      productionOrders.push(productionOrder);
    }
    console.log(`✅ ${productionOrders.length} ordens de produção criadas`);

    // Criar fichas de produção
    console.log('📄 Criando fichas de produção...');
    const productionSheets = [];
    for (let i = 0; i < productionOrders.length; i++) {
      const productionOrder = productionOrders[i];
      const entryDate = getRandomDate(new Date('2025-01-01'), new Date('2025-06-01'));
      const expectedExitDate = new Date(entryDate.getTime() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000);

      const productionSheet = new ProductionSheet({
        productionOrderId: productionOrder._id,
        entryDate: entryDate,
        expectedExitDate: expectedExitDate,
        machine: machines[Math.floor(Math.random() * machines.length)],
        stage: stages[Math.floor(Math.random() * stages.length)],
        productionNotes: `Ficha de produção para ${productionOrder.developmentId.name || 'Desenvolvimento'}`,
        temperature: Math.floor(Math.random() * 50) + 20,
        velocity: Math.floor(Math.random() * 50) + 10
      });

      await productionSheet.save();
      productionSheets.push(productionSheet);
    }
    console.log(`✅ ${productionSheets.length} fichas de produção criadas`);

    // Criar fichas de entrega
    console.log('🚚 Criando fichas de entrega...');
    const deliverySheets = [];
    for (let i = 0; i < productionSheets.length; i++) {
      const productionSheet = productionSheets[i];
      const deliveryDate = getRandomDate(new Date('2025-02-01'), new Date('2025-08-01'));
      const totalValue = Math.floor(Math.random() * 50000) + 5000;

      const deliverySheet = new DeliverySheet({
        productionSheetId: productionSheet._id,
        internalReference: productionSheet.internalReference,
        deliveryDate: deliveryDate,
        totalValue: totalValue,
        notes: `Entrega para desenvolvimento ${i + 1}`,
        invoiceNumber: `NF${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        address: {
          street: 'Rua de Entrega',
          number: Math.floor(Math.random() * 9999).toString(),
          complement: `Apto ${Math.floor(Math.random() * 999)}`,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        },
        status: deliveryStatuses[Math.floor(Math.random() * deliveryStatuses.length)]
      });

      await deliverySheet.save();
      deliverySheets.push(deliverySheet);
    }
    console.log(`✅ ${deliverySheets.length} fichas de entrega criadas`);

    // Criar recibos de produção
    console.log('🧾 Criando recibos de produção...');
    const productionReceipts = [];
    for (let i = 0; i < deliverySheets.length; i++) {
      const deliverySheet = deliverySheets[i];
      const totalAmount = deliverySheet.totalValue;
      const paidAmount = Math.random() > 0.3 ? totalAmount : Math.floor(totalAmount * Math.random());
      const paymentStatus = paidAmount >= totalAmount ? 'PAID' : 'PENDING';
      const paymentDate = paymentStatus === 'PAID' ? getRandomDate(new Date('2025-01-01'), new Date()) : null;

      const dueDate = getRandomDate(new Date('2025-01-01'), new Date('2025-12-31'));

      const productionReceipt = new ProductionReceipt({
        deliverySheetId: deliverySheet._id,
        internalReference: deliverySheet.internalReference,
        totalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: totalAmount - paidAmount,
        paymentStatus: paymentStatus,
        paymentDate: paymentDate,
        dueDate: dueDate,
        paymentMethod: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PIX', 'CHECK'][Math.floor(Math.random() * 6)],
        notes: `Recibo para entrega ${deliverySheet.invoiceNumber}`
      });

      await productionReceipt.save();
      productionReceipts.push(productionReceipt);
    }
    console.log(`✅ ${productionReceipts.length} recibos de produção criados`);

    console.log('\n🎉 Dados de teste gerados com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   👥 Clientes: ${clients.length}`);
    console.log(`   🎨 Desenvolvimentos: ${developments.length}`);
    console.log(`   📋 Ordens de Produção: ${productionOrders.length}`);
    console.log(`   📄 Fichas de Produção: ${productionSheets.length}`);
    console.log(`   🚚 Fichas de Entrega: ${deliverySheets.length}`);
    console.log(`   🧾 Recibos de Produção: ${productionReceipts.length}`);

  } catch (error) {
    console.error('❌ Erro ao gerar dados de teste:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar script
generateTestData();
