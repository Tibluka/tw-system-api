# API de Administração - Atualização de Senhas

## ⚠️ ATENÇÃO: APIs Temporárias sem Autenticação

Estas APIs foram criadas temporariamente para facilitar a atualização de senhas. **Devem ser removidas em produção!**

---

## 📋 Endpoints Disponíveis

### 1. Atualizar Senha de Usuário Específico

**Endpoint:** `POST /api/v1/admin/update-user-password`

**Descrição:** Atualiza a senha de um usuário específico.

**Body:**

```json
{
  "email": "usuario@exemplo.com",
  "password": "novaSenha123"
}
```

**Exemplo de Curl:**

```bash
curl -X POST http://localhost:3000/api/v1/admin/update-user-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "validacao.desenvolvimento@twestamparia.com.br",
    "password": "teste123"
  }'
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Senha atualizada com sucesso",
  "data": {
    "email": "validacao.desenvolvimento@twestamparia.com.br",
    "name": "Maurício",
    "role": "DEFAULT",
    "passwordChangedAt": "2025-10-07T17:35:00.000Z"
  }
}
```

**Validações:**

- ✅ Email é obrigatório
- ✅ Senha é obrigatória
- ✅ Senha deve ter pelo menos 6 caracteres
- ✅ Usuário deve existir no banco

---

### 2. Atualizar Senhas de Todos os Usuários de Validação

**Endpoint:** `POST /api/v1/admin/update-passwords`

**Descrição:** Atualiza automaticamente as senhas de todos os usuários de validação com senhas aleatórias de 6 caracteres.

**Body:** `{}` (vazio)

**Exemplo de Curl:**

```bash
curl -X POST http://localhost:3000/api/v1/admin/update-passwords \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Senhas atualizadas com sucesso",
  "data": {
    "updatedUsers": [
      {
        "email": "validacao.desenvolvimento@twestamparia.com.br",
        "password": "Abc123",
        "role": "DEFAULT",
        "name": "Maurício"
      },
      {
        "email": "validacao.pcp@twestamparia.com.br",
        "password": "Xyz789",
        "role": "DEFAULT",
        "name": "Bruno"
      },
      {
        "email": "validacao.recibos@twestamparia.com.br",
        "password": "Def456",
        "role": "FINANCING",
        "name": "Bárbara"
      }
    ],
    "errors": [],
    "totalUpdated": 3,
    "totalErrors": 0
  }
}
```

---

### 3. Verificar Informações de Usuário

**Endpoint:** `POST /api/v1/admin/check-user`

**Descrição:** Verifica as informações de um usuário específico.

**Body:**

```json
{
  "email": "usuario@exemplo.com"
}
```

**Exemplo de Curl:**

```bash
curl -X POST http://localhost:3000/api/v1/admin/check-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "validacao.desenvolvimento@twestamparia.com.br"
  }'
```

**Resposta de Sucesso:**

```json
{
  "success": true,
  "message": "Usuário encontrado",
  "data": {
    "name": "Maurício",
    "email": "validacao.desenvolvimento@twestamparia.com.br",
    "role": "DEFAULT",
    "isActive": true,
    "hasPassword": true,
    "passwordChangedAt": "2025-10-07T17:35:00.000Z",
    "createdAt": "2025-10-07T10:00:00.000Z"
  }
}
```

---

## 🔐 Usuários de Validação

| Nome     | Email                                           | Role      |
| -------- | ----------------------------------------------- | --------- |
| Maurício | `validacao.desenvolvimento@twestamparia.com.br` | DEFAULT   |
| Bruno    | `validacao.pcp@twestamparia.com.br`             | DEFAULT   |
| Bárbara  | `validacao.recibos@twestamparia.com.br`         | FINANCING |

---

## 📝 Exemplos de Uso

### Atualizar senha do usuário de desenvolvimento:

```bash
curl -X POST http://localhost:3000/api/v1/admin/update-user-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "validacao.desenvolvimento@twestamparia.com.br",
    "password": "novaSenha123"
  }'
```

### Atualizar senha do usuário de recibos:

```bash
curl -X POST http://localhost:3000/api/v1/admin/update-user-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "validacao.recibos@twestamparia.com.br",
    "password": "senhaFinanceira456"
  }'
```

### Gerar novas senhas aleatórias para todos:

```bash
curl -X POST http://localhost:3000/api/v1/admin/update-passwords \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ⚠️ Códigos de Erro

| Código | Descrição                 |
| ------ | ------------------------- |
| `2001` | Campo obrigatório ausente |
| `2005` | Formato de senha inválido |
| `5001` | Usuário não encontrado    |
| `6005` | Erro interno do servidor  |

---

## 🚨 IMPORTANTE

**Estas APIs devem ser REMOVIDAS antes de ir para produção!**

Para remover:

1. Deletar o arquivo `src/routes/admin.js`
2. Remover a linha no `src/app.js`:
   ```javascript
   const adminRoutes = require('./routes/admin');
   app.use('/api/v1/admin', adminRoutes);
   ```

---

## 📊 Status Atual

✅ API funcionando
✅ Senhas sendo criptografadas com bcrypt (salt 12)
✅ Timestamps sendo atualizados
✅ Validações implementadas
