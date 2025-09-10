const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    logger.info('🔗 Tentando conectar ao MongoDB Atlas...');
    
    // Configurações mínimas necessárias
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(config.MONGODB_URI, options);
    
    logger.info('🍃 MongoDB conectado com sucesso!');
    logger.info(`📦 Database: ${mongoose.connection.name}`);
    logger.info(`🏠 Host: ${mongoose.connection.host}`);
    
    // Event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('❌ Erro na conexão:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB desconectado');
    });
    
  } catch (error) {
    logger.error('❌ Erro ao conectar ao MongoDB:');
    logger.error('📝 Mensagem:', error.message || 'Erro sem mensagem');
    logger.error('🏷️ Nome:', error.name || 'Erro sem nome');
    logger.error('🔢 Código:', error.code || 'Erro sem código');
    
    // Em desenvolvimento, continuar tentando
    if (config.isDevelopment()) {
      logger.info('⏰ Tentando novamente em 10 segundos...');
      setTimeout(connectDB, 10000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;