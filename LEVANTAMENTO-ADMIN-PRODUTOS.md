# Levantamento — Menu administrativo + Cadastro/Listagem de produtos

> **Status:** levantamento original concluído; o apêndice de implementação no fim registra as decisões e mudanças posteriores. As seções de diagnóstico descrevem o estado observado antes da implementação.

## 1. Requisito

**História do usuário sugerida:**

> Dado que o usuário com perfil `admin` acesse a área logada, quando a sessão for validada, então o sistema deve exibir o menu administrativo e o submenu “Cadastro de produto”, permitindo cadastrar e listar roupas e acessórios.

**Decomposição técnica:**

| Item | Necessidade |
|---|---|
| Identificação do perfil | O frontend precisa saber que o usuário autenticado é `admin` |
| Menu administrativo | Área visual separada da loja, visível apenas para admin |
| Submenu de produtos | Item “Produtos” com ações “Cadastrar” e “Listar” |
| Cadastro | Formulário + endpoint protegido para criar produto |
| Listagem | Tabela/lista consumindo os produtos cadastrados |
| Categorias | Distinguir roupas e acessórios |
| Segurança | O backend deve bloquear clientes, independentemente da interface |

## 2. Estado atual do projeto

### 2.1 Autenticação e perfis — funcional

- O login retorna `token`, `usuario.id`, `usuario.nome`, `usuario.email` e `usuario.perfil` (`backend/controllers/authController.js:133-142`).
- O JWT dura 2 horas e não carrega o perfil como fonte de verdade (`authController.js:124-131`).
- O middleware `authMiddlewares.js` valida o token e consulta o perfil atual no MySQL a cada requisição (`backend/middleware/authMiddlewares.js:40-61`).
- O middleware `autorizarPerfil.js` retorna `403` para perfis não autorizados (`backend/middleware/autorizarPerfil.js:13-17`).
- Já existe a rota protegida `GET /admin/teste`, que exige `admin` (`backend/routes/adminRoutes.js:7-16`).
- Existe migração para a coluna `perfil ENUM('cliente','admin')` (`backend/database/migrations/001-add-usuario-perfil.sql`).
- Existem testes cobrindo login, sessão, perfil vindo do banco e bloqueio de cliente em rota admin (`backend/tests/authProfiles.test.js`).

**Conclusão:** a base de autenticação/autorização necessária já está pronta e pode ser reaproveitada.

### 2.2 Frontend — login e sessão

- O login está implementado inline em `frontend/pages/areadelogin.html:90-154`.
- Após o login, são salvos apenas `authToken`, `userName` e `userEmail` (`areadelogin.html:134-136`). **O perfil não é salvo.**
- O redirecionamento vai para `../index.html` para qualquer usuário (`areadelogin.html:143-145`).
- O `index.html` já consulta `GET /auth/me` ao carregar (`frontend/index.html:571-601`), mas:
  - usa apenas o nome do usuário;
  - **ignora `data.usuario.perfil`** (`index.html:590-596`);
  - não possui menu administrativo;
  - mostra apenas “Olá, nome” e “Sair”.
- O frontend usa `frontend/js/login.js` e `frontend/js/register.js`; a URL da API compartilhada fica em `frontend/js/config.js`.

### 2.3 Produtos — totalmente estáticos

- O catálogo está escrito manualmente em `frontend/index.html:182-398` (8 cards).
- Os mesmos produtos também estão duplicados em um objeto JavaScript em `frontend/js/store.js:4-13`.
- A sacola usa esse objeto fixo para preço, nome e imagem (`store.js:16-25`, `store.js:57-59`).
- **Não existe tabela de produtos, controller, rota ou tela de administração.**
- As categorias atuais da loja são `camisetas`, `acessorios` e `jaquetas` (`index.html:141-169`), o que **não corresponde exatamente** a “roupas e acessórios”.

### 2.4 Banco de dados

- Só existem scripts de migração para `usuarios.perfil` e promoção manual a admin.
- Não há `CREATE TABLE` de produtos.
- O schema da tabela `usuarios` não está versionado no repositório; o README já alerta sobre isso.
- O backend usa uma única conexão MySQL (`backend/database/connection.js`).

### 2.5 Infraestrutura

- `backend/src/server.js` monta `/auth`, `/admin` e `/health`.
- `frontend/js/config.js` aponta para `http://localhost:3000` no desenvolvimento; para publicar, é necessário definir a URL HTTPS real da API.
- Frontend é estático, sem build.
- CORS usa a lista de origens configurada em `CORS_ORIGINS` (com origens locais como padrão de desenvolvimento).

## 3. Lacunas em relação ao requisito

| # | Lacuna | Impacto |
|---|---|---|
| 1 | Nenhuma tela administrativa existe | Não há onde exibir menu/submenu |
| 2 | O frontend não guarda nem usa o perfil retornado por `/auth/me` | Impossível decidir se mostra o menu admin |
| 3 | Não existe tabela `produtos` | Cadastro/listagem não têm persistência |
| 4 | Não existem endpoints de produtos | Frontend não tem o que consumir |
| 5 | O catálogo é estático e duplicado | Produtos cadastrados não apareceriam na loja |
| 6 | Não há definição fechada de categorias | “Roupas” e “acessórios” conflitam com `camisetas`, `jaquetas`, `acessorios` |
| 7 | Não há tratamento de upload de imagem | Precisa decidir entre URL ou upload |
| 8 | Não há página/lógica de logout administrativo | Precisa reaproveitar o padrão atual |

## 4. Proposta de solução

### 4.1 Banco de dados — nova migração

Criar `backend/database/migrations/002-create-produtos.sql`, seguindo o padrão idempotente da migração existente.

Estrutura sugerida:

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | `INT UNSIGNED AUTO_INCREMENT` | PK |
| `nome` | `VARCHAR(100)` | obrigatório |
| `descricao` | `VARCHAR(500)` | opcional |
| `preco` | `DECIMAL(10,2)` | obrigatório, maior que zero |
| `categoria` | `ENUM('roupas','acessorios')` | obrigatório |
| `imagem_url` | `VARCHAR(500)` | opcional |
| `ativo` | `TINYINT(1)` | padrão `1` |
| `criado_em` | `TIMESTAMP` | padrão `CURRENT_TIMESTAMP` |
| `atualizado_em` | `TIMESTAMP` | atualização automática |

Índices sugeridos: `categoria` e `ativo`.

> **Decisão pendente:** usar `ENUM` simples agora ou criar uma tabela `categorias` com chave estrangeira. Para o escopo atual, `ENUM` é suficiente; para a evolução prevista no `copilot-instructions.md` (categorias, variações, estoque), uma tabela `categorias` seria mais sustentável.

> **Alinhamento necessário:** a loja usa `camisetas`, `acessorios` e `jaquetas`. O requisito fala em `roupas` e `acessorios`. É preciso definir se “roupas” será um guarda-chuva ou se o cadastro terá as três categorias existentes.

### 4.2 Backend — controller e rotas

Criar `backend/controllers/productController.js` com:

| Função | Responsabilidade |
|---|---|
| `listar` | Buscar produtos no MySQL |
| `criar` | Validar e inserir produto |

Rotas sugeridas em `backend/routes/adminRoutes.js`:

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/admin/produtos` | JWT + admin | Lista produtos |
| `POST` | `/admin/produtos` | JWT + admin | Cadastra produto |

Sugestão de organização: aplicar `authMiddleware` e `autorizarPerfil("admin")` uma única vez com `router.use(...)`, mantendo a rota `/admin/teste` existente.

**Contrato sugerido do `POST /admin/produtos`:**

```json
{
  "nome": "Camiseta Oversized",
  "descricao": "Algodão pesado",
  "preco": 89.9,
  "categoria": "roupas",
  "imagemUrl": "https://exemplo.com/imagem.jpg",
  "ativo": true
}
```

**Validações obrigatórias no servidor:**

- `nome`: string, 3 a 100 caracteres.
- `preco`: número finito maior que zero; converter para `DECIMAL` no banco.
- `categoria`: apenas valores permitidos.
- `imagemUrl`: opcional, mas se enviada deve ser `http` ou `https`.
- `ativo`: booleano.
- Consultas sempre parametrizadas.
- Respostas: `201` ao criar, `400` em validação, `401` sem token, `403` para cliente, `500` em erro interno.

**Opcional para o requisito:** `GET /produtos` público para o catálogo da loja. Isso já entra na discussão de integração com a vitrine (ver seção 8).

### 4.3 Frontend — área administrativa

Criar uma página separada, por exemplo:

```text
frontend/pages/admin.html
frontend/js/admin.js
```

**Fluxo de acesso:**

1. Ler `authToken` do `localStorage`.
2. Se não existir, redirecionar para `areadelogin.html`.
3. Chamar `GET /auth/me`.
4. Se `401`, limpar sessão e redirecionar.
5. Se o perfil não for `admin`, exibir mensagem de acesso negado e oferecer retorno à loja.
6. Somente após validar, renderizar o painel.

**Layout sugerido:**

- Cabeçalho com marca, nome do admin, link “Ver loja” e “Sair”.
- Menu lateral administrativo:
  - Dashboard (opcional)
  - **Produtos**
    - Cadastrar produto
    - Listar produtos
- Conteúdo principal alternando entre formulário e tabela.
- Layout responsivo, reutilizando as variáveis CSS existentes (`--color-accent`, `--font-display`, etc.).

**Formulário:**

- Nome
- Descrição
- Preço
- Categoria (`roupas` / `acessorios`)
- URL da imagem
- Ativo
- Botão “Cadastrar produto”
- Feedback de sucesso/erro com `role="status"` e `aria-live`

**Listagem:**

- Tabela com ID, nome, categoria, preço, status e imagem.
- Estado vazio (“Nenhum produto cadastrado”).
- Renderização com `textContent`/`createElement`, nunca `innerHTML` com dados do usuário, seguindo o padrão seguro já usado em `store.js`.

### 4.4 Integração com a área logada atual

Em `frontend/index.html`:

- Adicionar um link oculto “Painel administrativo” no `nav-actions`.
- No script existente, usar o `perfil` retornado por `/auth/me` para exibir o link somente quando `perfil === "admin"`.
- Em caso de falha na consulta, manter o link oculto (fail closed).
- Não confiar no `localStorage` para decidir permissão; ele serve no máximo para conveniência visual.

**Importante:** esconder o menu é apenas usabilidade. A proteção real continua sendo o middleware do backend.

### 4.5 Login

Opcionalmente, em `areadelogin.html`:

- Redirecionar admin para `admin.html` e cliente para `index.html`.
- Ou manter o redirecionamento atual e exibir o link administrativo no `index.html`.

A segunda opção atende melhor ao texto “ao acessar a área logada, apresentar o menu administrativo”, pois a área logada atual é o `index.html`.

## 5. Arquivos provavelmente impactados

### Novos

| Arquivo | Finalidade |
|---|---|
| `backend/database/migrations/002-create-produtos.sql` | Criar tabela de produtos |
| `backend/controllers/productController.js` | Regras de listar/cadastrar |
| `frontend/pages/admin.html` | Área administrativa |
| `frontend/js/admin.js` | Validação de sessão, formulário e listagem |
| `backend/tests/products.test.js` | Testes de autorização e CRUD |

### Modificados

| Arquivo | Alteração |
|---|---|
| `backend/routes/adminRoutes.js` | Adicionar rotas de produtos |
| `frontend/index.html` | Link “Painel administrativo” condicionado ao perfil |
| `frontend/css/style.css` | Estilos do painel, menu, formulário e tabela |
| `frontend/pages/areadelogin.html` | Opcional: redirecionamento por perfil |
| `README.md` | Documentar migração e endpoints |
| `backend/tests/authProfiles.test.js` | Possível ajuste se o fake DB for compartilhado |

### Sem alteração necessária

- `backend/controllers/authController.js`
- `backend/middleware/authMiddlewares.js`
- `backend/middleware/autorizarPerfil.js`
- `backend/database/connection.js`
- `backend/src/server.js` (a menos que se crie uma rota pública `/produtos`)

## 6. Critérios de aceite sugeridos

| Cenário | Resultado esperado |
|---|---|
| Admin faz login e acessa a área logada | Vê o menu administrativo e o submenu de produtos |
| Admin abre “Cadastrar produto” | Vê formulário com nome, preço, categoria e imagem |
| Admin cadastra uma roupa válida | Recebe confirmação, produto é salvo e aparece na listagem |
| Admin cadastra um acessório válido | Produto aparece com a categoria correta |
| Admin envia preço inválido | Recebe `400` e mensagem clara, sem gravar |
| Admin envia categoria inválida | Recebe `400`, mesmo que burle o formulário |
| Cliente autenticado tenta abrir `/pages/admin.html` | Não vê o painel; é orientado a voltar à loja |
| Cliente chama `GET/POST /admin/produtos` | Recebe `403` |
| Usuário sem token chama rota administrativa | Recebe `401` |
| Token expirado ou usuário removido | Sessão é limpa e usuário volta ao login |
| Admin lista produtos | Vê os produtos cadastrados, inclusive os recém-criados |
| Produto recém-cadastrado na loja pública | **Depende da decisão de escopo da seção 8** |

## 7. Riscos e pontos de atenção

1. **Catálogo público continuar estático**  
   Se o cadastro for apenas administrativo, os produtos novos não aparecerão na vitrine. O `store.js` e os cards do `index.html` continuam fixos. Isso pode frustrar a expectativa do requisito.

2. **Duplicação atual do catálogo**  
   Hoje os produtos existem em dois lugares: HTML e `store.js`. Uma integração futura com o banco exigirá refatorar cards, filtros, ordenação e sacola.

3. **Categorias divergentes**  
   “Roupas” não é uma categoria existente na loja. É necessário alinhar o vocabulário para evitar produtos que não aparecem em nenhum filtro.

4. **Imagem do produto**  
   Não há upload nem armazenamento de arquivos. Para o MVP, o campo “URL da imagem” evita nova dependência. Upload exigiria `multer`, armazenamento local ou serviço externo, além de validação de tipo/tamanho.

5. **Segurança do frontend**  
   O menu oculto não protege nada. Toda rota administrativa precisa do middleware, como já ocorre em `/admin/teste`.

6. **XSS na listagem**  
   Se a listagem usar `innerHTML` com nome/descrição vindos do banco, haverá risco de XSS armazenado. Usar `textContent` e criação de elementos.

7. **Schema de `usuarios` não versionado**  
   A migração de produtos não deve assumir a criação do banco nem da tabela de usuários. Seguir o padrão defensivo da migração `001`.

8. **CORS e ambiente**  
   O CORS está aberto e a URL da API é um túnel ngrok de desenvolvimento. Isso não bloqueia o requisito, mas deve ser tratado antes de produção.

9. **Testes atuais usam banco falso**  
   O teste existente intercepta `database/connection`. Os testes de produtos precisarão de um fake DB próprio ou de testes de integração com MySQL.

10. **Escopo de estoque, tamanhos e cores**  
    O `copilot-instructions.md` prevê essas funcionalidades, mas elas **não fazem parte deste requisito**. Recomenda-se não incluí-las agora para evitar aumento desnecessário de escopo.

## 8. Decisões fechadas para esta implementação

1. **Onde ficará o painel?** Página separada `frontend/pages/admin.html`, com link mostrado somente após `/auth/me` confirmar o perfil `admin`.

2. **A listagem alimentará a loja pública?** Sim. A API pública fornece os produtos ativos; a vitrine preserva os cards e mantém seus dados locais como fallback quando a API não responde.

3. **Categorias:** `camisetas`, `acessorios` e `jaquetas`, preservando os filtros já existentes; administradores podem criar categorias adicionais.

4. **Imagem:** URL HTTP/HTTPS; upload não faz parte deste MVP.

5. **Campos do produto:** nome, descrição, preço, categoria, imagem, status, variações de tamanho/cor e estoque. Tamanhos, cores e quantidades reais não são presumidos para os produtos antigos.

6. **Após o login:** o administrador permanece na loja e vê o link para o painel; não há redirecionamento automático.

## 9. Estimativa aproximada

| Etapa | Esforço |
|---|---|
| Migração da tabela de produtos | 0,5 dia |
| Controller + rotas + validações | 1 dia |
| Testes de backend | 0,5 dia |
| Página administrativa + menu + formulário | 1 a 1,5 dia |
| Listagem + estados de erro/carregamento | 0,5 dia |
| Estilos responsivos e acessibilidade | 0,5 dia |
| README e ajustes finais | 0,5 dia |
| **Total MVP administrativo** | **~4 a 5 dias** |
| Integração com a vitrine pública | +1 a 2 dias |

## 10. Sequência recomendada de implementação

1. Fechar as decisões da seção 8.
2. Criar a migração `002-create-produtos.sql` e validar no MySQL.
3. Criar `productController.js` e as rotas protegidas em `adminRoutes.js`.
4. Adicionar testes de `401`, `403`, validação `400` e criação `201`.
5. Criar `pages/admin.html` + `js/admin.js` com bloqueio por perfil.
6. Adicionar o link “Painel administrativo” no `index.html`.
7. Estilizar menu, formulário e tabela no `style.css`.
8. Atualizar o README.
9. Validar manualmente os fluxos de admin, cliente e usuário deslogado.
10. Decidir se a vitrine será integrada agora ou em uma etapa seguinte.

## 11. Resumo executivo

O projeto **já possui a base de autenticação e autorização por perfil**, incluindo verificação do perfil diretamente no banco e uma rota administrativa funcional. O que falta é:

- uma **tabela e API de produtos**;
- uma **página administrativa** com menu e submenu;
- o **uso do perfil `admin` no frontend** para exibir o menu;
- a **listagem e o formulário de cadastro**;
- a decisão sobre **integração com a vitrine pública** e **categorias**.

## 12. Apêndice — implementação do comércio

Implementação aplicada em 31/10/2026, preservando login, cadastro, autenticação JWT, identidade visual e estrutura existente da sacola:

- Migração `backend/database/migrations/002-create-commerce-tables.sql`: cria categorias, produtos, variações, estoque, movimentações, pedidos e itens; sem apagar ou recriar o schema. Inclui cadastro idempotente dos oito produtos existentes, preservando seus slugs usados pela sacola. Como não havia informação confiável de tamanho, cor ou quantidade, esses dados precisam ser cadastrados pelo administrador; os produtos não ficam disponíveis para compra até existir uma variação com estoque.
- `backend/controllers/commerceController.js`, `backend/routes/adminRoutes.js`, `backend/routes/productRoutes.js`, `backend/routes/orderRoutes.js` e `backend/src/server.js`: adicionam catálogo público, gerenciamento administrativo protegido, dashboard, categorias, variações, ajustes de estoque, histórico e pedidos. O cliente só lista os próprios pedidos.
- `frontend/pages/admin.html`, `frontend/js/admin.js` e `frontend/css/style.css`: painel independente com indicadores de banco, cadastro/edição/desativação, categorias, variações, ajustes e confirmação de pedido.
- `frontend/js/store.js` e `frontend/index.html`: catálogo consulta a API mantendo os cards, filtros, ordenação e sacola; link administrativo depende do perfil retornado pelo `/auth/me`; inclusão de pedido usa a sacola atual e preserva o resumo copiável.
- `frontend/pages/pedidos.html` e `frontend/js/orders.js`: consulta autenticada dos pedidos do próprio cliente.
- Pedidos são criados `pendentes`; nenhuma integração de pagamento é simulada. A confirmação administrativa baixa o estoque numa transação com `SELECT ... FOR UPDATE`, registra movimentações e só aceita pedidos pendentes. A chave de idempotência e a restrição única impedem repetir a criação de um pedido já recebido.
- `README.md`: descreve ordem da migração, endpoints, operação e limitações.

**Validação realizada:** `npm test` executou 8 testes de autenticação, autorização e validação de payloads; todos passaram. A sintaxe dos scripts JavaScript do backend e frontend foi verificada com `node --check`.

**Pendente antes de produção:** executar a migração após backup e confirmar que `usuarios.id` é `BIGINT UNSIGNED`, como validado preventivamente pelo script e pelo schema compartilhado; criar tamanhos/cores e estoque reais; validar as transações e as chaves estrangeiras contra a versão/schema reais do MySQL; testar os fluxos completos em navegador. Pagamento, frete, cancelamento e estorno continuam fora do MVP.
