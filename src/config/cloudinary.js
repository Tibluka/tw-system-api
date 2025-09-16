// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

console.log('=== VERIFICANDO CLOUDINARY CONFIG ===');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'DEFINIDO' : '❌ NÃO DEFINIDO');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'DEFINIDO' : '❌ NÃO DEFINIDO');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'DEFINIDO' : '❌ NÃO DEFINIDO');

// Configuração do Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Testar conexão com Cloudinary
cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary conectado:', result);
  })
  .catch(error => {
    console.log('❌ Erro na conexão com Cloudinary:', error.message);
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
      const developmentId = req.params.id || req.body.developmentId;
      const timestamp = Date.now();
      const publicId = `development_${developmentId}_${timestamp}`;
      console.log('📝 Gerando public_id:', publicId);
      return publicId;
    }
  },
});

// Configuração do multer com logs
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Validando arquivo:', file.originalname, file.mimetype);
    
    // Verificar se é imagem
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ Arquivo válido');
      cb(null, true);
    } else {
      console.log('❌ Arquivo inválido - não é imagem');
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

// Função para deletar imagem do Cloudinary
const deleteImage = async (publicId) => {
  try {
    console.log('🗑️ Deletando imagem do Cloudinary:', publicId);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Imagem deletada:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro ao deletar imagem do Cloudinary:', error);
    throw error;
  }
};

// Função para gerar URLs otimizadas
const generateOptimizedUrls = (publicId) => {
  console.log('🖼️ Gerando URLs otimizadas para:', publicId);
  
  if (!publicId) {
    console.log('❌ Public ID não fornecido');
    return {};
  }
  
  const urls = {
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
  
  console.log('URLs geradas:', urls);
  return urls;
};

module.exports = {
  cloudinary,
  upload,
  deleteImage,
  generateOptimizedUrls
};