# Debugging Geolocation - Por que o endereço não preenche?

## Checklist Rápido

- [ ] Servidor rodando em HTTPS? (`npm run dev:web`)
- [ ] Celular/PC acessa: `https://192.168.15.7:5178/`
- [ ] Celular está na mesma rede WiFi?
- [ ] Aceitou permissão de localização?

---

## Como Debugar no Celular

### 1. Abra Chrome DevTools

1. **PC:** Navegue para a URL de rede
   ```
   https://192.168.15.7:5178/
   ```

2. **Abra DevTools:**
   - Pressione `F12`
   - Ou clique botão direito → Inspecionar

3. **Vá para a aba "Console"**

### 2. Teste a Captura de Localização

1. No app, clique no botão **"Capturar minha localização"**
2. Autorize a localização quando o navegador pedir
3. **Observe os logs no Console**

---

## Logs Esperados

### ✅ Sucesso Completo

```
[Geolocation] Buscando endereço para: -23.123456, -45.654321
[Geolocation] Endereço encontrado: {road: "Rua Example", house_number: "123", ...}
[Geolocation] Resultado parseado: {street: "Rua Example", number: "123", city: "São Paulo", ...}
```

**Resultado:** Todos os campos preenchidos ✅

---

### ⚠️ Sucesso Parcial (Coordenadas OK, Endereço Incompleto)

```
[Geolocation] Buscando endereço para: -23.123456, -45.654321
[Geolocation] Endereço encontrado: {city: "São Paulo", ...}  ← Sem rua!
[Geolocation] Resultado parseado: {city: "São Paulo", street: undefined, ...}
```

**Resultado:** Latitude/Longitude preenchidas, mas rua está vazia

**Causa:** OpenStreetMap não tem dados detalhados daquele local

**Solução:** Preencha a rua manualmente

---

### ❌ Falha Total (Sem coordenadas)

```
[Geolocation] Erro ao fazer reverse geocode: TypeError: navigator is undefined
```

Ou:

```
Erro: Geolocation não suportado ou permissão negada
```

---

## Problemas Comuns

### "Não preenche o nome da rua"

**Causas possíveis:**

1. **OpenStreetMap não tem dados da rua**
   - Algumas ruas recentes/alteradas não têm dados
   - Solução: Preencha manualmente
   - Contribua em https://www.openstreetmap.org/

2. **Nominatim retornando campo vazio**
   - Veja o console para logs [Geolocation]
   - Se vir `[Geolocation] Endereço encontrado: {city: ..., road: null}`
   - É problema do OpenStreetMap, não da app

3. **Rede lenta**
   - Nominatim pode demorar
   - Aumentar timeout (veja abaixo)

### "Coordenadas não capturam"

**Causas:**

1. **Não está em HTTPS**
   - Geolocation só funciona em HTTPS
   - Verifique URL: começa com `https://`?

2. **Permissão negada**
   - Navegador bloqueou localização
   - Configure em: Configurações > Privacidade > Localização

3. **GPS indisponível**
   - WiFi only não funciona bem
   - Deixe GPS ligado no celular

---

## Aba Network - Ver Requisição para Nominatim

1. **DevTools → Network**
2. Clique em "Capturar localização"
3. Procure por requisição para `nominatim.openstreetmap.org`
4. Clique nela e veja:
   - **Status:** Deve ser 200
   - **Response:** JSON com os dados do endereço

### Exemplo de Response OK:

```json
{
  "place_id": 123456,
  "licence": "...",
  "address": {
    "house_number": "123",
    "road": "Rua Example",
    "suburb": "Bairro",
    "city": "São Paulo",
    "state": "SP",
    "postcode": "01234-567",
    "ISO3166-2-lvl4": "BR-SP"
  }
}
```

### Response com Dados Incompletos:

```json
{
  "address": {
    "city": "São Paulo",
    "state": "SP"
    // ⚠️ Falta: road, suburb, house_number
  }
}
```

---

## Aumentar Timeout da Geocodificação

Se Nominatim está muito lento:

**Arquivo:** `apps/web/src/features/construction-opportunities/pages/OpportunityWizardPage.tsx`

**Procure:**
```typescript
const response = await fetch(..., {
  headers: { ... }
});
```

**Adicione:**
```typescript
const response = await fetch(..., {
  headers: { ... },
  signal: AbortSignal.timeout(30000)  // 30 segundos ao invés de padrão
});
```

---

## Teste com IP Fixo

Se o endereço não preenche em nenhum local:

1. Teste com coordenadas de um bairro famoso:
   - **Centro de SP:** `-23.5505, -46.6333`
   - **Av. Paulista:** `-23.5614, -46.6560`

2. No console, execute:
```javascript
// Teste direto
const url = `https://nominatim.openstreetmap.org/reverse?lat=-23.5505&lon=-46.6333&format=json&addressdetails=1`;
fetch(url).then(r => r.json()).then(data => console.log(data));
```

3. Veja se Nominatim retorna dados

---

## Performance

**Primeira captura:** Pode demorar (WiFi scanning)
- Deixe até 15-20 segundos

**Próximas capturas:** Mais rápidas (cache)

---

## Referências

- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Reverse/)
- [OpenStreetMap Data](https://www.openstreetmap.org/)
- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

## Ainda não funciona?

1. Compartilhe os **logs do console** (copie tudo do [Geolocation])
2. Compartilhe a **resposta de Network** do Nominatim
3. Diga o **endereço exato** que testou
4. Diga o **país/cidade** (Nominatim tem dados melhores em alguns lugares)
