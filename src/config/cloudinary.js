// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuração do storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tw-system/developments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => {
      // Gerar ID único baseado no development
      const developmentId = req.params.id || req.body.developmentId;
      const timestamp = Date.now();
      return `development_${developmentId}_${timestamp}`;
    }
  },
});

// Configuração do multer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar se é imagem
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// Função para deletar imagem do Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erro ao deletar imagem do Cloudinary:', error);
    throw error;
  }
};

// Função para gerar URLs otimizadas
const generateOptimizedUrls = (publicId) => {
  return {
    original: cloudinary.url(publicId),
    thumbnail: cloudinary.url(publicId, {
      transformation: [
        { width: 150, height: 150, crop: 'fill', quality: 'auto:low' }
      ]
    }),
    small: cloudinary.url(publicId, {
      transformation: [
        { width: 300, height: 300, crop: 'limit', quality: 'auto:good' }
      ]
    }),
    medium: cloudinary.url(publicId, {
      transformation: [
        { width: 600, height: 600, crop: 'limit', quality: 'auto:good' }
      ]
    }),
    large: cloudinary.url(publicId, {
      transformation: [
        { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }
      ]
    })
  };
};

module.exports = {
  cloudinary,
  upload,
  deleteImage,
  generateOptimizedUrls
};