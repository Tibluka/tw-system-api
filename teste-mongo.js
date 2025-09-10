require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  console.log('🧪 TESTE SIMPLES DE CONEXÃO');
  console.log('📍 Tentando conectar...');
  
  try {
    // Conexão mais simples possível
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ SUCESSO! Conectado ao MongoDB');
    console.log('🏠 Host:', mongoose.connection.host);
    console.log('📦 Database:', mongoose.connection.name);
    console.log('📊 Estado:', mongoose.connection.readyState);
    
    // Teste básico - criar uma coleção
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));
    await TestModel.findOne(); // Só para testar se consegue fazer query
    
    console.log('✅ Query de teste funcionou!');
    
    await mongoose.disconnect();
    console.log('🔒 Desconectado com sucesso');
    
  } catch (error) {
    console.error('❌ ERRO:');
    console.error('Tipo:', typeof error);
    console.error('Constructor:', error.constructor.name);
    console.error('Message:', error.message || 'SEM MENSAGEM');
    console.error('Code:', error.code || 'SEM CÓDIGO');
    console.error('Name:', error.name || 'SEM NOME');
    console.error('Stack:', error.stack || 'SEM STACK');
    console.error('Error completo:', JSON.stringify(error, null, 2));
  }
  
  process.exit(0);
}

testConnection();