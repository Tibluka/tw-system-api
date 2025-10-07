# Sistema de Permissões - TW System API

## Visão Geral

O sistema de permissões da TW System API é baseado em perfis de usuário que definem quais endpoints e operações cada usuário pode acessar.

## Perfis de Usuário

### 1. DEFAULT

**Descrição**: Perfil padrão com acesso amplo, exceto a recursos financeiros.

**Permissões**:

- ✅ Acesso a todos os endpoints EXCETO relacionados a recibos
- ✅ Pode criar, ler, atualizar e deletar:
  - Clientes
  - Desenvolvimentos
  - Ordens de produção
  - Fichas de produção
  - Fichas de entrega
- ❌ NÃO pode acessar recibos de produção

**Endpoints permitidos**:

- `/api/v1/auth`
- `/api/v1/users`
- `/api/v1/clients`
- `/api/v1/developments`
- `/api/v1/production-orders`
- `/api/v1/production-sheets`
- `/api/v1/delivery-sheets`
- `/api/v1/health`

### 2. PRINTING

**Descrição**: Perfil específico para operadores de impressão com acesso limitado.

**Permissões**:

- ✅ Acesso APENAS a fichas de produção
- ✅ Pode alterar apenas os campos `stage` e `machine`
- ✅ Só pode alterar `stage` quando a ordem de produção relacionada estiver com status `PILOT_PRODUCTION`
- ❌ NÃO pode acessar outros recursos

**Endpoints permitidos**:

- `/api/v1/auth`
- `/api/v1/production-sheets`
- `/api/v1/health`

**Restrições específicas**:

- Só pode alterar `stage` e `machine` em fichas de produção
- Só pode alterar `stage` quando `productionOrder.status === 'PILOT_PRODUCTION'`
- Não pode alterar outros campos como `temperature`, `velocity`, etc.

### 3. ADMIN

**Descrição**: Perfil administrativo com acesso total ao sistema.

**Permissões**:

- ✅ Acesso completo a todos os endpoints
- ✅ Pode realizar todas as operações
- ✅ Sem restrições

**Endpoints permitidos**:

- Todos os endpoints da API

### 4. FINANCING

**Descrição**: Perfil financeiro com acesso a recursos relacionados a pagamentos e clientes.

**Permissões**:

- ✅ Acesso a recibos de produção
- ✅ Acesso a clientes
- ❌ NÃO pode acessar outros recursos

**Endpoints permitidos**:

- `/api/v1/auth`
- `/api/v1/clients`
- `/api/v1/production-receipts`
- `/api/v1/health`

## Implementação Técnica

### Middleware de Permissões

O sistema utiliza middlewares específicos para controlar o acesso:

1. **checkEndpointPermission**: Verifica se o usuário pode acessar o endpoint
2. **checkResourceAccess**: Verifica acesso a recursos específicos
3. **checkCreatePermission**: Verifica permissões de criação
4. **checkPrintingRestrictions**: Aplica restrições específicas do perfil PRINTING

### Estrutura de Arquivos

```
src/middleware/
├── permissions.js          # Middlewares de permissão
├── auth.js                 # Autenticação (existente)
└── errorHandler.js         # Tratamento de erros (existente)
```

### Rotas Protegidas

Todas as rotas principais foram atualizadas para usar o novo sistema:

- `src/routes/users.js`
- `src/routes/clients.js`
- `src/routes/developments.js`
- `src/routes/productionOrders.js`
- `src/routes/productionSheets.js`
- `src/routes/deliverySheets.js`
- `src/routes/productionReceipts.js`

## Migração

### Migração de Usuários Existentes

Para migrar usuários existentes do sistema antigo:

```bash
node scripts/migrateUserRoles.js
```

Este script:

- Converte usuários `STANDARD` para `DEFAULT`
- Mantém usuários `ADMIN` como estão
- Exibe estatísticas da migração

### Atualização do Modelo User

O modelo User foi atualizado para incluir os novos perfis:

```javascript
role: {
  type: String,
  enum: ['DEFAULT', 'PRINTING', 'ADMIN', 'FINANCING'],
  default: 'DEFAULT'
}
```

## Testes

### Executar Testes de Permissão

```bash
npm test -- permissions.test.js
```

Os testes verificam:

- Acesso correto por perfil
- Restrições específicas do perfil PRINTING
- Validação de campos permitidos
- Verificação de status de ordem de produção

## Exemplos de Uso

### Criar Usuário com Perfil Específico

```javascript
// Criar usuário com perfil PRINTING
const printingUser = await User.create({
  name: 'Operador Impressão',
  email: 'operador@empresa.com',
  password: 'senha123',
  role: 'PRINTING'
});
```

### Verificar Permissões no Frontend

```javascript
// Verificar se usuário pode acessar recurso
const canAccessReceipts = user.role === 'FINANCING' || user.role === 'ADMIN';
const canAccessProduction =
  user.role === 'PRINTING' || user.role === 'DEFAULT' || user.role === 'ADMIN';
```

## Segurança

### Boas Práticas

1. **Sempre verificar permissões no backend**: Nunca confiar apenas na validação do frontend
2. **Usar HTTPS**: Todas as comunicações devem ser criptografadas
3. **Tokens JWT**: Implementar expiração adequada de tokens
4. **Logs de auditoria**: Registrar todas as operações sensíveis

### Tratamento de Erros

O sistema retorna códigos HTTP apropriados:

- `401`: Não autenticado
- `403`: Acesso negado (sem permissão)
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

## Manutenção

### Adicionar Novo Perfil

1. Atualizar enum no modelo User
2. Adicionar permissões no middleware `permissions.js`
3. Atualizar rotas necessárias
4. Criar testes para o novo perfil
5. Atualizar documentação

### Modificar Permissões

1. Atualizar `ENDPOINT_PERMISSIONS` no middleware
2. Modificar middlewares específicos se necessário
3. Atualizar testes
4. Documentar mudanças

## Suporte

Para dúvidas ou problemas com o sistema de permissões, consulte:

1. Este documento
2. Testes de exemplo em `src/tests/permissions.test.js`
3. Middleware de permissões em `src/middleware/permissions.js`
4. Logs da aplicação para debugging
