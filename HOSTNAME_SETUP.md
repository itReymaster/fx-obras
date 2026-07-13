# Configuração de Hostname fx-obras.local

## Visão Geral

Este guia configura `https://fx-obras.local:5178/` como URL de desenvolvimento estável que não muda quando o IP da rede muda.

---

## Instalação Rápida (Automática)

### No Windows (PowerShell como Admin)

```powershell
# 1. Abra PowerShell como Administrador
# Clique direito no ícone do PowerShell → "Executar como administrador"

# 2. Navegue até o diretório do projeto
cd c:\Gestão\Obras\fx-obras

# 3. Execute o script de configuração
.\scripts\setup-hostname.ps1
```

**Esperado:**
```
✅ Entrada 'fx-obras.local' já existe no arquivo hosts
   ou
✅ Entrada adicionada com sucesso!
```

---

## Instalação Manual (Windows Hosts File)

Se preferir fazer manualmente:

1. **Abra o arquivo hosts:**
   - Caminho: `C:\Windows\System32\drivers\etc\hosts`
   - Abra com: Bloco de Notas (como Admin)

2. **Adicione esta linha ao final do arquivo:**
   ```
   127.0.0.1    fx-obras.local
   ```

3. **Salve o arquivo** (Ctrl + S)

4. **Reinicie o navegador** (pode ser necessário limpar cache)

---

## Como Usar

### Iniciar o servidor

```bash
npm run dev:web
```

Você verá:
```
VITE v8.1.4  ready in 427 ms

  ➜  Local:   https://localhost:5178/
  ➜  Local:   https://fx-obras.local:5178/
  ➜  Network: https://192.168.15.7:5178/
```

### Acessar localmente

```
https://fx-obras.local:5178/
```

### Acessar de outro device na rede

1. Abra navegador no outro device
2. Acesse: `https://fx-obras.local:5178/`
3. Navegador mostrará aviso de certificado (esperado):
   - **Chrome/Edge**: "Avançado" → "Acessar site (inseguro)"
   - **Firefox**: "Avançado" → "Aceitar risco e continuar"
   - **Safari**: "Detalhes" → "Acessar este website"
4. Você está dentro!

---

## Vantagens

✅ **URL consistente** - Não muda quando o IP muda  
✅ **Profissional** - Nome amigável em vez de IP numérico  
✅ **Funciona offline** - Resolvido localmente na rede  
✅ **Seguro** - Usa HTTPS mesmo em desenvolvimento  
✅ **Simples** - Um único comando de setup  

---

## Resolução de Problemas

### "Não consigo acessar fx-obras.local"

1. **Verificar se foi adicionado ao hosts:**
   ```powershell
   # Em PowerShell Admin
   Get-Content C:\Windows\System32\drivers\etc\hosts | Select-String fx-obras
   ```
   Deve mostrar: `127.0.0.1    fx-obras.local`

2. **Limpar cache de DNS:**
   ```powershell
   ipconfig /flushdns
   ```

3. **Reiniciar navegador:** Feche e abra novamente

### "Ainda não funciona em outro device"

- Certifique-se de que está **na mesma rede** (WiFi ou Ethernet)
- Teste primeiro com o IP: `https://192.168.15.7:5178/`
- Se o IP funciona mas o hostname não, o outro device também precisa ter a entrada no hosts file dele

### "Aviso de certificado muito forte"

É esperado ter aviso com certificado auto-assinado. Para eliminar:
1. Instale mkcert: `choco install mkcert`
2. Regenere certificados: `npm run certs:generate`
3. Reinicie servidor: `npm run dev:web`

---

## Remoção

Se quiser remover a configuração:

1. **Opção 1 - Remover do hosts file:**
   - Abra `C:\Windows\System32\drivers\etc\hosts` como Admin
   - Delete a linha `127.0.0.1    fx-obras.local`
   - Salve o arquivo

2. **Opção 2 - Restaurar backup:**
   ```powershell
   Copy-Item C:\Windows\System32\drivers\etc\hosts.backup C:\Windows\System32\drivers\etc\hosts -Force
   ```

---

## Referências

- [Wikipedia: Hosts file](https://en.wikipedia.org/wiki/Hosts_(file))
- [Microsoft: Arquivo Hosts](https://support.microsoft.com/pt-br/topic/como-usar-o-arquivo-hosts-para-bloquear-sites-da-web-a5bbd3c8-c8f5-4d38-b6a8-d0a5fbe6e1db)
- [Vite - HTTPS](https://vite.dev/config/server-options.html#server-https)
