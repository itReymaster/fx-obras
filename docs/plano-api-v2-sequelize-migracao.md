# Plano de arquitetura: API v2 com Sequelize sem perder funcionalidades

## 1) Objetivo
Criar uma API v2 com Sequelize para preparar o time para futuras mudanças de banco, sem quebrar a interface atual nem perder funcionalidades do app.

Este plano parte de uma premissa importante:
- O front-end nao deve depender do ORM.
- O front-end deve continuar consumindo contratos HTTP estaveis.
- A mudanca real acontece na camada de persistencia e adaptacao interna da API.

---

## 2) Decisao recomendada
Sim, a ideia faz sentido, mas com uma regra:

1. A API v1 atual continua funcionando.
2. A API v2 nasce em paralelo.
3. A v2 usa Sequelize na camada de dados.
4. A interface so troca de versao depois de validacao completa.

Isso reduz risco e evita parada brusca.

---

## 3) Por que isso ajuda no futuro
Se a v2 for bem desenhada, o time ganha:

1. Camada de persistencia substituivel.
2. Menos dependencia do Prisma.
3. Caminho mais claro para SQL Server no futuro.
4. Possibilidade de migrar por modulo, sem reescrever o sistema todo.

Importante: Sequelize por si so nao resolve o futuro. O que resolve e a arquitetura separada em camadas.

---

## 4) Principio principal para nao perder funcionalidade
Nao reescreva tudo de uma vez.

A API v2 deve manter:
- mesmos recursos de negocio;
- mesmos conceitos de dominio;
- mesmas validacoes importantes;
- mesmos formatos de resposta quando possivel;
- mesma experiencia do front.

Se o contrato mudar demais, o front quebra ou passa a carregar muita adaptacao.

---

## 5) Estrutura sugerida

### 5.1 Camadas
Use esta divisao:

1. `routes` - expor endpoints
2. `controllers` - receber request e devolver response
3. `services` - regras de negocio e orquestracao
4. `repositories` - acesso a banco via Sequelize
5. `domain` - modelos e regras centrais
6. `dtos` - formatos de entrada/saida
7. `mappers` - conversao entre entidade, DTO e modelo

### 5.2 Ideia central
A API v2 deve falar com o banco apenas pelos repositories.
Isso facilita trocar banco depois sem mexer em controllers e services.

---

## 6) Estrategia de convivencia v1 + v2

### Opcao recomendada
Manter duas APIs por um periodo:

1. API v1 atual - continua atendendo o app.
2. API v2 - roda paralela com Sequelize.

Depois:
- o front passa a consumir v2 por modulo;
- o time valida resultado;
- a v1 pode ser desativada aos poucos.

### Beneficio
Se algo der errado na v2, a v1 continua disponivel.

---

## 7) Contrato de API

### Regra
Na primeira fase, tente nao alterar:
- nomes de campos principais;
- estrutura de listas;
- regras de status;
- comportamento de soft delete;
- filtros da listagem;
- exportacao e historico.

### O que pode mudar internamente
- o ORM;
- a forma como consulta o banco;
- organizacao interna do codigo.

---

## 8) Modulos que precisam ser mantidos na v2
Pelo projeto atual, os modulos mais sensiveis sao:

1. oportunidades de obra;
2. fotos;
3. historico;
4. dashboard;
5. filtros e busca;
6. soft delete;
7. exportacao;
8. integracao CRM;
9. geolocalizacao/endereco.

Esses fluxos nao podem quebrar.

---

## 9) Plano tecnico da v2

### Fase 1 - Fundacao
1. Criar nova pasta de API v2.
2. Configurar Sequelize.
3. Criar conexao com ambiente atual.
4. Organizar models e repositories.
5. Criar base de logs e tratamento de erro.

### Fase 2 - Repositorio de obras
1. Implementar model principal de obras.
2. Implementar create/read/update/delete.
3. Implementar filtros e paginação.
4. Implementar contadores e dashboard.

### Fase 3 - Recursos secundarios
1. Fotos.
2. Historico.
3. Status.
4. Exportacao.
5. Integracao CRM.

### Fase 4 - Validação funcional
1. Comparar respostas v1 e v2.
2. Testar fluxo de tela a tela.
3. Testar mobile e desktop.
4. Testar listagem, detalhe, captura, edicao e exclusao.

### Fase 5 - Virada gradual
1. Front muda para v2 em ambiente de teste.
2. Time valida.
3. Front muda para v2 em producao.
4. v1 fica como fallback temporario.

---

## 10) Regras de repositorio com Sequelize
O repository precisa seguir regras bem objetivas:

1. Nao expor Sequelize no controller.
2. Nao misturar SQL cru em toda parte.
3. Centralizar consultas complexas em repository.
4. Manter soft delete como padrao.
5. Manter data de captura e historico coerentes.
6. Preservar JSON de tags e relacoes de fotos.

---

## 11) Pontos de compatibilidade que nao podem quebrar

### 11.1 Listagem
A listagem precisa continuar com:
- paginação;
- ordenação;
- busca por texto;
- filtros por cidade, status, tipo, potencial e teste.

### 11.2 Detalhe
A tela de detalhe precisa continuar com:
- foto principal;
- galeria;
- dados de localizacao;
- dados de contato;
- qualificação;
- historico.

### 11.3 Captura
O fluxo de captura precisa manter:
- endereço;
- fotos;
- geolocalização;
- revisão;
- confirmação.

---

## 12) Migração sem perder funcionalidade

### Regra de ouro
Qualquer endpoint novo da v2 deve ser validado com teste equivalente da v1.

### Ordem sugerida
1. leituras simples;
2. criação;
3. edicao;
4. upload de fotos;
5. histórico;
6. dashboard;
7. exportação;
8. integracao externa.

Assim o time reduz risco.

---

## 13) Estrutura de pastas sugerida para a v2
Exemplo:

```text
apps/api-v2/
  src/
    app.ts
    server.ts
    config/
    modules/
      construction-opportunities/
        controllers/
        domain/
        dtos/
        mappers/
        repositories/
        routes/
        services/
        use-cases/
    shared/
      database/
      errors/
      http/
      middlewares/
```

Se nao quiser criar outro app agora, a mesma organizacao pode existir dentro da API atual em um namespace `v2`.

---

## 14) Sequelize: quando ele ajuda
Sequelize pode ajudar quando:

1. o time quer reduzir dependencia de Prisma;
2. o banco alvo futuro e SQL Server;
3. a estrategia precisa de SQL mais controlado;
4. o time quer ter um caminho mais tradicional de ORM.

Mas ele exige disciplina de arquitetura.

---

## 15) Riscos reais

### Risco 1: duplicar regra de negocio
Mitigacao:
- colocar regras em services ou use-cases compartilhados.

### Risco 2: front quebrar por contrato diferente
Mitigacao:
- manter resposta identica sempre que possivel.

### Risco 3: v2 virar uma nova bagunca
Mitigacao:
- criar padrao de repository + mapper + service desde o inicio.

### Risco 4: migração incompleta de fotos/historico
Mitigacao:
- criar checklist de regressao por modulo.

---

## 16) Critérios de aceite
A v2 so pode substituir a v1 quando:

1. criar obra funciona;
2. editar obra funciona;
3. excluir obra funciona;
4. fotos funcionam;
5. histórico funciona;
6. filtros funcionam;
7. dashboard bate com a v1;
8. mobile e desktop estao equivalentes;
9. sem perda de dados no teste de migração.

---

## 17) Plano sugerido para o dev

### Semana 1
1. montar estrutura v2;
2. conectar Sequelize;
3. model principal;
4. repository principal;
5. endpoints basicos.

### Semana 2
1. fotos e historico;
2. dashboard e filtros;
3. testes comparativos;
4. ajustes de contrato.

### Semana 3
1. migração de dados;
2. homologacao;
3. virada controlada;
4. desativacao progressiva da v1.

---

## 18) Conclusao objetiva
Sim, da para fazer e faz sentido.

A melhor estrategia e:
1. criar uma API v2 paralela;
2. usar Sequelize na persistencia;
3. manter a interface consumindo o mesmo contrato;
4. migrar por modulo, sem perder funcionalidades;
5. fazer a troca final somente depois de validação.

Se quiser, o proximo passo pode ser um documento ainda mais pratico com:
- estrutura exata de pastas,
- exemplo de models Sequelize,
- exemplo de repository,
- checklist de endpoints para o time seguir.
