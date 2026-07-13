# ⚙️ Setup Manual do Hostname fx-obras.local

## 3 Passos Simples

### Passo 1: Abrir o arquivo hosts como Administrador

**Windows 10/11:**

1. Clique no botão **Iniciar** (Windows)
2. Digite: `notepad`
3. **Clique com botão direito** em "Bloco de Notas"
4. Selecione **"Executar como administrador"**

**Bloqueie os avisos do UAC:** Clique "Sim"

---

### Passo 2: Abrir o arquivo hosts

No Bloco de Notas:

1. Clique em **Arquivo** → **Abrir**
2. Cole este caminho na barra de endereço:
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```
3. Clique **Abrir**

---

### Passo 3: Adicionar a entrada

No final do arquivo, adicione esta linha:

```
127.0.0.1    fx-obras.local
```

**Exemplo de como fica:**

```
# localhost name resolution is handled within DNS itself.
#	127.0.0.1       localhost
#	::1             localhost

# IPv4 Address - Add your hostname here
127.0.0.1    fx-obras.local
```

---

### Passo 4: Salvar

Pressione **Ctrl + S** para salvar

**✅ Pronto!**

---

## Verificar se funcionou

Abra o **PowerShell** e execute:

```powershell
Resolve-DnsName fx-obras.local
```

Deve mostrar:
```
Name                                           Type   TTL   Section    IPAddress
----                                           ----   ---   -------    ---------
fx-obras.local                                 A      600   Answer     127.0.0.1
```

---

## Agora use a URL

```bash
npm run dev:web
```

Acesse:
- **Localmente:** https://fx-obras.local:5178/
- **De outro device:** https://fx-obras.local:5178/

---

## Problemas?

### "Não consigo salvar o arquivo"

- Certifique-se de que abriu como **Administrador**
- Procure pelo símbolo de escudo ao lado do título do Notepad

### "Ainda não funciona"

1. **Limpar cache de DNS:**
   ```powershell
   ipconfig /flushdns
   ```

2. **Reiniciar navegador** (feche completamente e abra novamente)

3. **Verificar se foi salvo:**
   ```powershell
   Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String fx-obras
   ```

### "Erro de certificado no navegador"

É esperado. Clique em:
- **Chrome:** "Avançado" → "Prosseguir para o site"
- **Firefox:** "Avançado" → "Aceitar risco"
- **Edge:** "Detalhes" → "Acessar de qualquer forma"

---

## Backup

Seu script criou um backup em:
```
C:\Windows\System32\drivers\etc\hosts.backup
```

Se tudo der errado, você pode restaurar:
```powershell
Copy-Item C:\Windows\System32\drivers\etc\hosts.backup C:\Windows\System32\drivers\etc\hosts -Force
ipconfig /flushdns
```

---

**Próximo passo:** `npm run dev:web` e acesse https://fx-obras.local:5178/ 🎉
