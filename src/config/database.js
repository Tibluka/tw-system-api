const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = config.isTest() ? config.MONGODB_TEST_URI : config.MONGODB_URI;
    
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    };

    const conn = await mongoose.connect(mongoURI, options);
    
    logger.info(`🍃 MongoDB conectado: ${conn.connection.host}`);
    
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose conectado ao MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('Erro na conexão do Mongoose:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose desconectado');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Conexão do Mongoose fechada devido ao encerramento da aplicação');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Erro ao conectar ao MongoDB:', error.message);
    
    if (config.isDevelopment()) {
      logger.info('Tentando reconectar em 5 segundos...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

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

const closeDB = async () => {
  await mongoose.connection.close();
  logger.info('Conexão com MongoDB fechada');
};

module.exports = connectDB;