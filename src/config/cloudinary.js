// src/config/cloudinary.js - CONFIGURAÇÃO ULTRA RÁPIDA

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ====================================================================
// CONFIGURAÇÃO ULTRA RÁPIDA - QUALIDADE REDUZIDA
// ====================================================================
const ultraFastStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tw-system/developments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 800,           // ← Máximo 800px (em vez de 1200)
        height: 800,
        crop: 'limit',
        quality: 'auto:low',  // ← Qualidade baixa para velocidade
        format: 'jpg'         // ← Força JPG (mais rápido que auto)
      }
    ],
    public_id: (req, file) => {
      // Public ID mais simples
      const timestamp = Date.now();
      return `dev_${timestamp}`;
    }
  },
});

// ====================================================================
// CONFIGURAÇÃO AINDA MAIS RÁPIDA - SEM TRANSFORMAÇÕES
// ====================================================================
const rawStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tw-system/temp', // ← Pasta temporária para teste
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // SEM transformações - upload direto
    public_id: (req, file) => {
      return `temp_${Date.now()}`;
    }
  },
});

// ====================================================================
// UPLOAD COM CONFIGURAÇÕES MÍNIMAS
// ====================================================================
const upload = multer({ 
  storage: rawStorage, // ← Use rawStorage para teste
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Verificação mínima
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens!'), false);
    }
  }
});

module.exports = {
  cloudinary,
  upload
};