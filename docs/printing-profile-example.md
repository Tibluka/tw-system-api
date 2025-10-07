# Exemplo de Uso - Perfil PRINTING

## Cenário

O perfil PRINTING precisa atualizar uma ficha de produção, mas só pode alterar os campos `machine` e `stage`. O sistema agora verifica apenas os campos que **realmente mudaram** no payload.

## Exemplo Prático

### Ficha de Produção Atual (no banco):

```json
{
  "_id": "68e3a98fa17e1ab87515eefb",
  "machine": 1,
  "entryDate": "2025-10-06T03:00:00.000Z",
  "expectedExitDate": "2025-10-08T03:00:00.000Z",
  "stage": "IN_PROGRESS",
  "temperature": 200,
  "velocity": 35,
  "productionOrderId": "507f1f77bcf86cd799439011"
}
```

### Payload Enviado pelo Frontend:

```json
{
  "machine": 2,
  "entryDate": "2025-10-06T03:00:00.000Z",
  "expectedExitDate": "2025-10-08T03:00:00.000Z",
  "stage": "IN_PROGRESS",
  "temperature": 200,
  "velocity": 35
}
```

## Análise do Sistema

### ✅ **PERMITIDO** - Apenas `machine` mudou:

**Campos comparados:**

- `machine`: 1 → 2 ✅ **MUDOU** (campo permitido)
- `entryDate`: "2025-10-06T03:00:00.000Z" → "2025-10-06T03:00:00.000Z" ❌ **NÃO MUDOU**
- `expectedExitDate`: "2025-10-08T03:00:00.000Z" → "2025-10-08T03:00:00.000Z" ❌ **NÃO MUDOU**
- `stage`: "IN_PROGRESS" → "IN_PROGRESS" ❌ **NÃO MUDOU**
- `temperature`: 200 → 200 ❌ **NÃO MUDOU**
- `velocity`: 35 → 35 ❌ **NÃO MUDOU**

**Resultado:** ✅ **PERMITIDO** - Apenas campo permitido (`machine`) foi alterado.

**Body filtrado enviado para o controller:**

```json
{
  "machine": 2
}
```

**Apenas o campo `machine` será atualizado no banco de dados!**

---

### ❌ **BLOQUEADO** - Campo proibido mudou:

**Payload com alteração proibida:**

```json
{
  "machine": 1,
  "entryDate": "2025-10-06T03:00:00.000Z",
  "expectedExitDate": "2025-10-08T03:00:00.000Z",
  "stage": "IN_PROGRESS",
  "temperature": 250,
  "velocity": 35
}
```

**Campos comparados:**

- `machine`: 1 → 1 ❌ **NÃO MUDOU**
- `stage`: "IN_PROGRESS" → "IN_PROGRESS" ❌ **NÃO MUDOU**
- `temperature`: 200 → 250 ✅ **MUDOU** (campo proibido)

**Resultado:** ❌ **BLOQUEADO** - Campo proibido (`temperature`) foi alterado.

**Erro retornado:**

```json
{
  "success": false,
  "message": "Perfil PRINTING só pode alterar os campos: stage, machine. Campos não permitidos sendo alterados: temperature",
  "code": 4008
}
```

---

### ✅ **PERMITIDO** - Alterando stage:

**Payload alterando stage:**

```json
{
  "machine": 1,
  "entryDate": "2025-10-06T03:00:00.000Z",
  "expectedExitDate": "2025-10-08T03:00:00.000Z",
  "stage": "FINISHED",
  "temperature": 200,
  "velocity": 35
}
```

**Campos comparados:**

- `stage`: "IN_PROGRESS" → "FINISHED" ✅ **MUDOU** (campo permitido)
- Outros campos: ❌ **NÃO MUDARAM**

**Resultado:** ✅ **PERMITIDO** - Apenas campo permitido (`stage`) foi alterado.

---

## Vantagens da Nova Implementação

1. **Flexibilidade:** Frontend pode enviar o objeto completo
2. **Segurança:** Sistema verifica apenas campos que mudaram
3. **Performance:** Não bloqueia desnecessariamente
4. **UX:** Usuário não precisa saber quais campos podem ser enviados
5. **Eficiência:** Apenas campos alterados são enviados para o banco de dados
6. **Filtro Inteligente:** `req.body` é filtrado automaticamente

## Campos Permitidos para Perfil PRINTING

- ✅ `stage` - Etapa da produção
- ✅ `machine` - Número da máquina

## Campos Bloqueados para Perfil PRINTING

- ❌ `entryDate` - Data de entrada
- ❌ `expectedExitDate` - Data esperada de saída
- ❌ `temperature` - Temperatura
- ❌ `velocity` - Velocidade
- ❌ `productionOrderId` - ID da ordem de produção
- ❌ Outros campos não listados como permitidos

## Como Funciona o Filtro

### 1. **Comparação de Campos:**

O sistema compara cada campo do `req.body` com o valor atual no banco de dados.

### 2. **Identificação de Mudanças:**

```javascript
// Função inteligente que considera tipos de data
const isValueChanged = (currentValue, newValue) => {
  // Se ambos são datas ou strings de data, comparar como datas
  if (isDateField(currentValue) || isDateField(newValue)) {
    const currentDate = parseToDate(currentValue);
    const newDate = parseToDate(newValue);

    if (currentDate && newDate) {
      return currentDate.getTime() !== newDate.getTime();
    }
  }

  // Para outros tipos, usar comparação JSON
  return JSON.stringify(currentValue) !== JSON.stringify(newValue);
};
```

### 3. **Filtro de Permissões:**

```javascript
// Apenas campos permitidos que mudaram são incluídos
if (allowedFields.includes(field)) {
  filteredBody[field] = newValue;
}
```

### 4. **Substituição do req.body:**

```javascript
// req.body original é substituído pelo filtrado
req.body = filteredBody;
```

### 5. **Comparação Inteligente de Datas:**

O sistema detecta automaticamente campos de data e os compara corretamente:

- ✅ `Date` object vs `string ISO` → Compara timestamps
- ✅ `"2025-10-06T03:00:00.000Z"` vs `Date(2025-10-06)` → **NÃO MUDOU**
- ✅ `"2025-10-07T03:00:00.000Z"` vs `Date(2025-10-06)` → **MUDOU**

### 6. **Resultado:**

O controller recebe apenas os campos que:

- ✅ Realmente mudaram (considerando tipos de data)
- ✅ São permitidos para o perfil
- ✅ Serão atualizados no banco

## Condições Adicionais

Para que a atualização seja permitida, a **ordem de produção** relacionada deve estar com status `PILOT_PRODUCTION`.
