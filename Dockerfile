# Use a imagem oficial do Node.js como base
FROM node:18-alpine

# Definir diretório de trabalho no container
WORKDIR /usr/src/app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código da aplicação
COPY --chown=nodejs:nodejs . .

# Criar diretórios necessários
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads

# Expor a porta da aplicação
EXPOSE 3000

# Trocar para usuário não-root
USER nodejs

# Comando para iniciar a aplicação
CMD ["npm", "start"]

# Labels para metadata
LABEL maintainer="your-email@example.com"
LABEL version="1.0.0"
LABEL description="TW-System API"