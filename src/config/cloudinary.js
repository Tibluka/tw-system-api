// src/config/cloudinary.js - VERSÃO OTIMIZADA

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ====================================================================
// CONFIGURAÇÃO RÁPIDA - SEM TRANSFORMAÇÕES NO UPLOAD
// ====================================================================
const fastStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tw-system/developments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // SEM transformações no upload - aplica depois via URL
    public_id: (req, file) => {
      const developmentId = req.params.id;
      const timestamp = Date.now();
      return `development_${developmentId}_${timestamp}`;
    }
  },
});

// ====================================================================
// CONFIGURAÇÃO MÉDIA - TRANSFORMAÇÕES MÍNIMAS
// ====================================================================
const balancedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tw-system/developments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        quality: 'auto:good', // Só otimização de qualidade
        fetch_format: 'auto'  // Formato automático
        // Removido: width, height, crop (fazemos via URL depois)
      }
    ],
    public_id: (req, file) => {
      const developmentId = req.params.id;
      const timestamp = Date.now();
      return `development_${developmentId}_${timestamp}`;
    }
  },
});

// ====================================================================
// UPLOAD CONFIGURÁVEL
// ====================================================================
const upload = multer({ 
  storage: fastStorage, // ← Troque aqui: fastStorage, balancedStorage
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB (reduzido de 10MB)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// ====================================================================
// URLs OTIMIZADAS - GERADAS SOB DEMANDA (NÃO NO UPLOAD)
// ====================================================================
const generateOptimizedUrls = (publicId) => {
  if (!publicId) return {};
  
  return {
    original: cloudinary.url(publicId),
    thumbnail: cloudinary.url(publicId, {
      transformation: [{ width: 150, height: 150, crop: 'fill', quality: 'auto:low' }]
    }),
    small: cloudinary.url(publicId, {
      transformation: [{ width: 300, height: 300, crop: 'limit', quality: 'auto:good' }]
    }),
    medium: cloudinary.url(publicId, {
      transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto:good' }]
    }),
    large: cloudinary.url(publicId, {
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }]
    })
  };
};

// ====================================================================
// VERSÃO AINDA MAIS RÁPIDA - SEM URLS OTIMIZADAS NO UPLOAD
// ====================================================================
const generateOptimizedUrlsLazy = (publicId) => {
  if (!publicId) return {};
  
  // Retorna só a URL original - as otimizadas são geradas quando necessário
  return {
    original: cloudinary.url(publicId)
    // thumbnail, small, medium, large são geradas sob demanda na interface
  };
};

// Função para deletar imagem
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  upload,
  deleteImage,
  generateOptimizedUrls,
  generateOptimizedUrlsLazy
};