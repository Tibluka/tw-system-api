# TW-System API

API REST para o sistema TW-System desenvolvida com Node.js, Express e MongoDB.

## 🚀 Funcionalidades

- ✅ Autenticação JWT com refresh tokens
- ✅ Sistema completo de usuários
- ✅ Middleware de segurança (Helmet, CORS, Rate Limiting)
- ✅ Validação de dados com Joi
- ✅ Tratamento centralizado de erros
- ✅ Logs estruturados com Winston
- ✅ Testes automatizados com Jest
- ✅ Documentação da API
- ✅ Dockerização completa
- ✅ ESLint e Prettier configurados

## 📋 Pré-requisitos

- Node.js 16+
- MongoDB 5+
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**

```bash
git clone <url-do-repositorio>
cd tw-system-api
```

2. **Instale as dependências**

```bash
npm install
```

3. **Configure as variáveis de ambiente**

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Inicie o MongoDB** (se local)

```bash
# Via Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Ou instale localmente
```

5. **Execute a aplicação**

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🐳 Docker

**Executar com Docker Compose:**

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f api

# Parar serviços
docker-compose down
```

**Serviços incluídos:**

- API (porta 3000)
- MongoDB (porta 27017)
- Mongo Express (porta 8081) - Interface web para MongoDB

## 📚 API Endpoints

### Autenticação

```
POST   /api/v1/auth/register       # Registrar usuário
POST   /api/v1/auth/login          # Login
POST   /api/v1/auth/refresh        # Renovar token
POST   /api/v1/auth/logout         # Logout
GET    /api/v1/auth/me             # Dados do usuário logado
PUT    /api/v1/auth/change-password # Alterar senha
POST   /api/v1/auth/forgot-password # Esqueci a senha
POST   /api/v1/auth/reset-password/:token # Resetar senha
```

### Usuários

```
GET    /api/v1/users               # Listar usuários (admin)
GET    /api/v1/users/:id           # Obter usuário
PUT    /api/v1/users/:id           # Atualizar usuário
DELETE /api/v1/users/:id           # Deletar usuário
```

### Outros

```
GET    /health                     # Health check
GET    /api/v1                     # Status da API
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

## 🔍 Linting e Formatação

```bash
# Verificar código
npm run lint

# Corrigir automaticamente
npm run lint:fix

# Formatar código
npm run format
```

## 📁 Estrutura do Projeto

```
src/
├── app.js                 # Configuração principal
├── server.js              # Ponto de entrada
├── config/                # Configurações
├── controllers/           # Controladores
├── middleware/            # Middlewares
├── models/                # Modelos do banco
├── routes/                # Rotas
├── services/              # Lógica de negócio
├── utils/                 # Utilitários
└── tests/                 # Testes
```

## 🔐 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação:

1. Faça login em `/api/v1/auth/login`
2. Use o token retornado no header `Authorization: Bearer <token>`
3. Para renovar o token, use `/api/v1/auth/refresh`

**Exemplo de uso:**

```javascript
// Login
const response = await fetch("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});

// Usar token nas requisições
const token = response.data.token;
fetch("/api/v1/users/me", {
  headers: { Authorization: `Bearer ${token}` },
});
```

## 🛠️ Configuração

### Variáveis de Ambiente

| Variável          | Descrição                    | Padrão                                |
| ----------------- | ---------------------------- | ------------------------------------- |
| `NODE_ENV`        | Ambiente da aplicação        | `development`                         |
| `PORT`            | Porta do servidor            | `3000`                                |
| `MONGODB_URI`     | URL do MongoDB               | `mongodb://localhost:27017/tw_system` |
| `JWT_SECRET`      | Chave secreta JWT            | -                                     |
| `JWT_EXPIRE`      | Tempo de expiração do token  | `7d`                                  |
| `ALLOWED_ORIGINS` | Origins permitidas para CORS | `http://localhost:4200`               |

### Papéis de Usuário

- **user**: Usuário comum
- **moderator**: Moderador com permissões extras
- **admin**: Administrador com acesso total

## 🚨 Tratamento de Erros

A API retorna erros no formato JSON padronizado:

```json
{
  "success": false,
  "message": "Mensagem de erro",
  "error": "Detalhes do erro (apenas em desenvolvimento)"
}
```

### Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autorizado
- `403` - Proibido
- `404` - Não encontrado
- `422` - Dados não processáveis
- `429` - Muitas tentativas
- `500` - Erro interno do servidor

## 🔄 Integração com Frontend Angular

Para integrar com seu projeto Angular:

1. **Configure o serviço HTTP no Angular:**

```typescript
// environment.ts
export const environment = {
  apiUrl: 'http://localhost:3000/api/v1'
};

// auth.service.ts
constructor(private http: HttpClient) {}

login(credentials: any) {
  return this.http.post(`${environment.apiUrl}/auth/login`, credentials);
}
```

2. **Configure interceptadores JWT:**

```typescript
// jwt.interceptor.ts
intercept(req: HttpRequest<any>, next: HttpHandler) {
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next.handle(req);
}
```

## 📈 Monitoramento

- Logs são salvos em `logs/app.log`
- Use `/health` para verificar status da API
- MongoDB pode ser monitorado via Mongo Express em `http://localhost:8081`

## 🤝 Contribuindo

1. Faça fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Scripts Disponíveis

```bash
npm start          # Inicia em produção
npm run dev        # Inicia em desenvolvimento
npm test           # Executa testes
npm run lint       # Verifica código
npm run setup:db   # Configura banco de dados
npm run seed       # Popula dados iniciais
```

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Se encontrar algum problema:

1. Verifique os logs em `logs/app.log`
2. Confirme se o MongoDB está rodando
3. Verifique as variáveis de ambiente
4. Consulte a documentação da API

---

Desenvolvido com ❤️ para o projeto TW-System
