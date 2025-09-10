const config = require('./env');

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir qualquer origin
    if (config.isDevelopment()) {
      return callback(null, true);
    }
    
    // Em produção, verificar lista de origins permitidas
    if (config.ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true, // Permitir cookies e headers de autenticação
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Per-Page'
  ],
  optionsSuccessStatus: 200, // Para compatibilidade com browsers antigos
  maxAge: 86400 // Cache preflight por 24 horas
};

module.exports = corsOptions;