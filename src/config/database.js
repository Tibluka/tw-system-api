const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = config.isTest() ? config.MONGODB_TEST_URI : config.MONGODB_URI;
    
    const options = {
      // Opções de conexão recomendadas
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    // Conectar ao MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`🍃 MongoDB conectado: ${conn.connection.host}`);
    
    // Event listeners para conexão
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose conectado ao MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('Erro na conexão do Mongoose:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexão do Mongoose fechada devido ao encerramento da aplicação');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Erro ao conectar ao MongoDB:', error.message);
    
    // Em desenvolvimento, tenta reconectar após 5 segundos
    if (config.isDevelopment()) {
      logger.info('Tentando reconectar em 5 segundos...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Função para limpar o banco de dados (útil para testes)
const clearDB = async () => {
  if (config.isTest()) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    logger.info('Banco de dados de teste limpo');
  } else {
    throw new Error('clearDB só pode ser executado em ambiente de teste');
  }
};

// Função para fechar conexão
const closeDB = async () => {
  await mongoose.connection.close();
  logger.info('Conexão com MongoDB fechada');
};

module.exports = {
  connectDB,
  clearDB,
  closeDB
};