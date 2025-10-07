# Validações de Usuário - TW System API

## Visão Geral

As validações de usuário foram atualizadas para trabalhar com os novos perfis de usuário implementados no sistema: `DEFAULT`, `PRINTING`, `ADMIN`, e `FINANCING`.

## Perfis de Usuário Suportados

### Perfis Válidos

- **DEFAULT**: Perfil padrão com acesso amplo
- **PRINTING**: Perfil específico para operadores de impressão
- **ADMIN**: Perfil administrativo com acesso total
- **FINANCING**: Perfil financeiro com acesso a recibos e clientes

### Perfis Removidos

- ~~**USER**: Substituído por DEFAULT~~
- ~~**STANDARD**: Substituído por DEFAULT~~

## Validações Implementadas

### 1. Validação de Login (`validateLogin`)

**Campos obrigatórios:**

- `email` (string, formato válido)
- `password` (string, não vazio)

**Códigos de erro:**

- `1003` - MISSING_REQUIRED_FIELD: Email e senha são obrigatórios
- `1004` - INVALID_EMAIL_FORMAT: Email inválido

**Exemplo de erro:**

```json
{
  "success": false,
  "message": "Email e senha são obrigatórios",
  "code": 1003
}
```

### 2. Validação de Registro (`validateRegister`)

**Campos obrigatórios:**

- `name` (string, 2-50 caracteres)
- `email` (string, formato válido)
- `password` (string, mínimo 6 caracteres)
- `role` (enum: DEFAULT, PRINTING, ADMIN, FINANCING)

**Códigos de erro:**

- `1003` - MISSING_REQUIRED_FIELD: Campos obrigatórios faltando
- `1009` - INVALID_STRING_LENGTH: Nome com tamanho inválido
- `1004` - INVALID_EMAIL_FORMAT: Email inválido
- `1005` - INVALID_PASSWORD_FORMAT: Senha muito curta
- `1008` - INVALID_ENUM_VALUE: Role inválido

**Exemplo de erro com role inválido:**

```json
{
  "success": false,
  "message": "Função deve ser DEFAULT, PRINTING, ADMIN ou FINANCING",
  "code": 1008
}
```

### 3. Validação de Criação de Usuário (`validateCreateUser`)

Versão mais robusta usando `express-validator` com as mesmas regras do registro.

**Exemplo de uso:**

```javascript
router.post('/users', validateCreateUser, userController.createUser);
```

### 4. Validação de Atualização de Usuário (`validateUpdateUser`)

**Campos opcionais:**

- `name` (string, 2-50 caracteres)
- `email` (string, formato válido)
- `password` (string, mínimo 6 caracteres)
- `role` (enum: DEFAULT, PRINTING, ADMIN, FINANCING)
- `active` (boolean)

**Exemplo de erro:**

```json
{
  "errors": [
    {
      "msg": "Função deve ser DEFAULT, PRINTING, ADMIN ou FINANCING",
      "param": "role",
      "location": "body"
    }
  ]
}
```

## Exemplos de Uso

### Criar Usuário com Perfil PRINTING

```javascript
const userData = {
  name: 'João Silva',
  email: 'joao.silva@empresa.com',
  password: 'senha123',
  role: 'PRINTING'
};

// POST /api/v1/users
// Headers: Authorization: Bearer <admin_token>
```

### Criar Usuário com Perfil FINANCING

```javascript
const userData = {
  name: 'Maria Financeira',
  email: 'maria.financeira@empresa.com',
  password: 'senha456',
  role: 'FINANCING'
};
```

### Atualizar Perfil de Usuário

```javascript
const updateData = {
  role: 'DEFAULT'
};

// PUT /api/v1/users/:id
// Headers: Authorization: Bearer <admin_token>
```

## Migração de Usuários Existentes

Para migrar usuários existentes do sistema antigo:

```bash
node scripts/migrateUserRoles.js
```

Este script:

- Converte usuários `STANDARD` para `DEFAULT`
- Converte usuários `USER` para `DEFAULT`
- Mantém usuários `ADMIN` como estão
- Exibe estatísticas da migração

## Códigos de Erro Específicos

| Código | Constante               | Descrição                    |
| ------ | ----------------------- | ---------------------------- |
| 1003   | MISSING_REQUIRED_FIELD  | Campos obrigatórios faltando |
| 1004   | INVALID_EMAIL_FORMAT    | Email com formato inválido   |
| 1005   | INVALID_PASSWORD_FORMAT | Senha com formato inválido   |
| 1008   | INVALID_ENUM_VALUE      | Role/perfil inválido         |
| 1009   | INVALID_STRING_LENGTH   | String com tamanho inválido  |

## Tratamento de Erros no Frontend

### JavaScript/TypeScript

```javascript
try {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.code) {
      case 1003:
        showError('Preencha todos os campos obrigatórios');
        break;
      case 1004:
        showError('Email inválido');
        break;
      case 1005:
        showError('Senha deve ter pelo menos 6 caracteres');
        break;
      case 1008:
        showError('Perfil inválido. Escolha entre: DEFAULT, PRINTING, ADMIN, FINANCING');
        break;
      case 1009:
        showError('Nome deve ter entre 2 e 50 caracteres');
        break;
      default:
        showError(error.message);
    }
  }
} catch (error) {
  console.error('Erro de rede:', error);
}
```

### React Hook

```javascript
import { useState } from 'react';

const useUserValidation = () => {
  const [errors, setErrors] = useState({});

  const validateUserData = userData => {
    const newErrors = {};

    if (!userData.name || userData.name.length < 2 || userData.name.length > 50) {
      newErrors.name = 'Nome deve ter entre 2 e 50 caracteres';
    }

    if (!userData.email || !isValidEmail(userData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!userData.password || userData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!['DEFAULT', 'PRINTING', 'ADMIN', 'FINANCING'].includes(userData.role)) {
      newErrors.role = 'Perfil inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return { errors, validateUserData, setErrors };
};
```

## Testes

As validações foram testadas e verificadas para garantir que:

1. ✅ Roles válidos (DEFAULT, PRINTING, ADMIN, FINANCING) são aceitos
2. ✅ Roles inválidos retornam erro 1008
3. ✅ Campos obrigatórios faltando retornam erro 1003
4. ✅ Emails inválidos retornam erro 1004
5. ✅ Senhas muito curtas retornam erro 1005
6. ✅ Códigos de erro específicos são retornados corretamente

## Compatibilidade

- ✅ Mantém compatibilidade com APIs existentes
- ✅ Validações antigas ainda funcionam (com warnings)
- ✅ Migração automática de usuários existentes
- ✅ Documentação atualizada
