# Exemplos de Erros de Permissão - TW System API

## ⚠️ IMPORTANTE: Correção de Códigos de Erro

**Problema corrigido**: Anteriormente, alguns erros de permissão estavam retornando código genérico 6005 (INTERNAL_SERVER_ERROR) ao invés dos códigos específicos.

**Solução implementada**:

- Função `getErrorCode()` atualizada para reconhecer mensagens específicas de permissão
- Middleware de auth e permissões atualizados para usar códigos específicos
- Controllers atualizados para usar códigos específicos

## Códigos de Erro de Permissão

### 4005 - PROFILE_ACCESS_DENIED

**Quando**: Usuário tenta acessar recurso não permitido para seu perfil.

```json
{
  "success": false,
  "message": "Acesso negado. Seu perfil (PRINTING) não tem permissão para acessar este recurso.",
  "code": 4005
}
```

### 4006 - PRINTING_RESTRICTION_VIOLATION

**Quando**: Perfil PRINTING viola alguma restrição específica.

```json
{
  "success": false,
  "message": "Perfil PRINTING só pode alterar os campos: stage, machine. Campos não permitidos: temperature, velocity",
  "code": 4006
}
```

### 4007 - PRODUCTION_ORDER_STATUS_RESTRICTION

**Quando**: Perfil PRINTING tenta alterar ficha quando ordem não está em PILOT_PRODUCTION.

```json
{
  "success": false,
  "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION",
  "code": 4007
}
```

### 4008 - FIELD_UPDATE_RESTRICTION

**Quando**: Usuário tenta alterar campos não permitidos.

```json
{
  "success": false,
  "message": "Perfil PRINTING só pode alterar os campos: stage, machine. Campos não permitidos: temperature, velocity",
  "code": 4008
}
```

### 4009 - ENDPOINT_ACCESS_DENIED

**Quando**: Usuário tenta acessar endpoint não permitido para seu perfil.

```json
{
  "success": false,
  "message": "Acesso negado. Apenas perfis FINANCING podem acessar recibos de produção.",
  "code": 4009
}
```

### 4010 - RESOURCE_CREATION_DENIED

**Quando**: Usuário tenta criar recurso não permitido para seu perfil.

```json
{
  "success": false,
  "message": "Acesso negado. Apenas administradores podem criar usuários.",
  "code": 4010
}
```

## Exemplos por Perfil

### Perfil DEFAULT

**Tentando acessar production-receipts:**

```json
{
  "success": false,
  "message": "Acesso negado. Apenas perfis FINANCING podem acessar recibos de produção.",
  "code": 4009
}
```

### Perfil PRINTING

**Tentando acessar clients:**

```json
{
  "success": false,
  "message": "Acesso negado. Apenas perfis FINANCING e DEFAULT podem acessar clientes.",
  "code": 4009
}
```

**Tentando alterar ficha quando ordem não está em PILOT_PRODUCTION:**

```json
{
  "success": false,
  "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION",
  "code": 4007
}
```

**Tentando alterar campos não permitidos:**

```json
{
  "success": false,
  "message": "Perfil PRINTING só pode alterar os campos: stage, machine. Campos não permitidos: temperature, velocity",
  "code": 4008
}
```

### Perfil FINANCING

**Tentando acessar developments:**

```json
{
  "success": false,
  "message": "Acesso negado. Seu perfil tem acesso limitado a recursos específicos.",
  "code": 4005
}
```

**Tentando acessar production-sheets:**

```json
{
  "success": false,
  "message": "Acesso negado. Apenas perfis PRINTING e DEFAULT podem acessar fichas de produção.",
  "code": 4009
}
```

## Como Tratar no Frontend

### JavaScript/TypeScript

```javascript
// Exemplo de tratamento de erro
try {
  const response = await fetch('/api/v1/production-receipts', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.code) {
      case 4005:
        // Perfil não tem acesso ao recurso
        showError('Seu perfil não tem permissão para acessar este recurso');
        break;
      case 4007:
        // Restrição de status da ordem de produção
        showError('A ordem de produção deve estar em PILOT_PRODUCTION');
        break;
      case 4008:
        // Restrição de campos
        showError('Você só pode alterar campos específicos');
        break;
      case 4009:
        // Acesso negado ao endpoint
        showError('Acesso negado a este recurso');
        break;
      case 4010:
        // Criação negada
        showError('Você não pode criar este tipo de recurso');
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

const usePermissionError = () => {
  const [error, setError] = useState(null);

  const handlePermissionError = (errorCode, message) => {
    const errorMessages = {
      4005: 'Seu perfil não tem permissão para acessar este recurso',
      4007: 'A ordem de produção deve estar em PILOT_PRODUCTION',
      4008: 'Você só pode alterar campos específicos',
      4009: 'Acesso negado a este recurso',
      4010: 'Você não pode criar este tipo de recurso'
    };

    setError({
      code: errorCode,
      message: errorMessages[errorCode] || message,
      type: 'permission'
    });
  };

  const clearError = () => setError(null);

  return { error, handlePermissionError, clearError };
};
```

## Logs de Auditoria

Todos os erros de permissão são logados com as seguintes informações:

```
[WARN] 403 - Acesso negado. Seu perfil (PRINTING) não tem permissão para acessar este recurso. - /api/v1/production-receipts - GET - 192.168.1.100
```

Isso permite rastrear tentativas de acesso não autorizado para fins de segurança e auditoria.

## ✅ Verificação de Funcionamento

Para verificar se os códigos de erro estão funcionando corretamente, você pode testar:

### Exemplo de Resposta Corrigida

**Antes (incorreto):**

```json
{
  "success": false,
  "error": {
    "statusCode": 403,
    "isOperational": true,
    "status": "fail",
    "code": 6005,
    "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION"
  },
  "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION",
  "code": 6005
}
```

**Depois (correto):**

```json
{
  "success": false,
  "error": {
    "statusCode": 403,
    "isOperational": true,
    "status": "fail",
    "code": 4007,
    "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION"
  },
  "message": "Você só pode alterar fichas de produção quando a ordem de produção estiver com status PILOT_PRODUCTION",
  "code": 4007
}
```

### Teste Manual

Você pode testar os códigos de erro fazendo uma requisição com um perfil PRINTING tentando alterar uma ficha de produção quando a ordem não está em PILOT_PRODUCTION. O código retornado deve ser **4007** e não mais 6005.
