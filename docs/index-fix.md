# Correção de Índices Duplicados - Mongoose

## ⚠️ Problema Identificado

Mongoose estava gerando warnings sobre índices duplicados:

```
Warning: Duplicate schema index on {"email":1} found
Warning: Duplicate schema index on {"cnpj":1} found
Warning: Duplicate schema index on {"internalReference":1} found
```

## 🔍 Causa

Os schemas estavam definindo índices de duas formas:

1. **No campo:** `unique: true` (cria índice automaticamente)
2. **Explicitamente:** `schema.index({ campo: 1 })`

Isso causava duplicação de índices.

## ✅ Correções Aplicadas

### 1. **User.js**

**Antes:**

```javascript
email: {
  type: String,
  unique: true  // Cria índice automaticamente
}

userSchema.index({ email: 1 }, { unique: true }); // Duplicado!
```

**Depois:**

```javascript
email: {
  type: String,
  unique: true  // Mantém apenas este
}

// NOTA: email já tem unique: true no schema, não precisa de index adicional
userSchema.index({ isActive: 1 });
```

### 2. **Client.js**

**Antes:**

```javascript
cnpj: {
  type: String,
  unique: true  // Cria índice automaticamente
}

clientSchema.index({ cnpj: 1 }); // Duplicado!
```

**Depois:**

```javascript
cnpj: {
  type: String,
  unique: true  // Mantém apenas este
}

// NOTA: cnpj já tem unique: true no schema, não precisa de index adicional
clientSchema.index({ active: 1 });
```

### 3. **Development.js**

**Antes:**

```javascript
internalReference: {
  type: String,
  unique: true  // Cria índice automaticamente
}

developmentSchema.index({ internalReference: 1 }); // Duplicado!
```

**Depois:**

```javascript
internalReference: {
  type: String,
  unique: true  // Mantém apenas este
}

// NOTA: internalReference já tem unique: true no schema, não precisa de index adicional
developmentSchema.index({ clientId: 1 });
```

### 4. **DeliverySheet.js**

**Antes:**

```javascript
internalReference: {
  type: String,
  unique: true  // Cria índice automaticamente
}

deliverySheetSchema.index({ internalReference: 1 }); // Duplicado!
```

**Depois:**

```javascript
internalReference: {
  type: String,
  unique: true  // Mantém apenas este
}

// NOTA: internalReference já tem unique: true no schema, não precisa de index adicional
deliverySheetSchema.index({ productionSheetId: 1 });
```

## 📋 Resumo das Mudanças

| Modelo        | Campo             | Ação                                              |
| ------------- | ----------------- | ------------------------------------------------- |
| User          | email             | Removido `schema.index({ email: 1 })`             |
| Client        | cnpj              | Removido `schema.index({ cnpj: 1 })`              |
| Development   | internalReference | Removido `schema.index({ internalReference: 1 })` |
| DeliverySheet | internalReference | Removido `schema.index({ internalReference: 1 })` |

## ✨ Resultado

**Antes:**

```
(node:71135) [MONGOOSE] Warning: Duplicate schema index on {"email":1}
(node:71135) [MONGOOSE] Warning: Duplicate schema index on {"cnpj":1}
(node:71135) [MONGOOSE] Warning: Duplicate schema index on {"internalReference":1}
```

**Depois:**

```
✅ Servidor rodando na porta 3000
✅ MongoDB conectado com sucesso!
(Sem warnings)
```

## 📚 Lição Aprendida

**Regra:** Quando um campo tem `unique: true`, o Mongoose cria automaticamente um índice único. **Não é necessário** adicionar `schema.index()` para esse campo.

**Quando usar `schema.index()`:**

- ✅ Para campos que **não** têm `unique: true`
- ✅ Para índices compostos: `schema.index({ campo1: 1, campo2: 1 })`
- ✅ Para índices de texto: `schema.index({ campo: 'text' })`
- ✅ Para índices com opções especiais

**Quando NÃO usar `schema.index()`:**

- ❌ Para campos que já têm `unique: true`
- ❌ Para campos que já têm `index: true`

## 🔧 Como Verificar

Para verificar os índices de uma coleção no MongoDB:

```javascript
db.users.getIndexes();
db.clients.getIndexes();
db.developments.getIndexes();
```

Cada campo deve aparecer **apenas uma vez** nos índices.
