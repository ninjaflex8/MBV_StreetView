# MBV StreetView

Loja estática em HTML, CSS e JavaScript, com API de autenticação em Node.js/Express e banco MySQL. A identidade visual atual usa fundo creme/branco, carvão e detalhes em verde-oliva.

## Estrutura

- `frontend/index.html`: vitrine, carrossel manual, filtros e sacola local.
- `frontend/pages`: páginas de login, cadastro, administração e consulta de pedidos.
- `frontend/css/style.css`: estilos, pontos de quebra e preferências de movimento reduzido.
- `frontend/js/config.js`: endereço da API e cabeçalhos públicos usados pelo frontend.
- `frontend/js/store.js`: carrossel, filtros, catálogo dinâmico com fallback estático e sacola local.
- `frontend/js/admin.js` e `frontend/pages/admin.html`: painel administrativo autenticado.
- `frontend/js/orders.js` e `frontend/pages/pedidos.html`: consulta dos pedidos do próprio cliente.
- `backend/src/server.js`: servidor Express, CORS e rotas.
- `backend/controllers`: cadastro e login.
- `backend/controllers/commerceController.js`: produtos, categorias, estoque, dashboard e pedidos.
- `backend/middleware`: autenticação JWT, autorização por perfil e validação de imagens enviadas.
- `backend/database`: conexão MySQL e migrações SQL.
- `backend/routes`: endpoints públicos de catálogo, pedidos autenticados e operações administrativas.
- `backend/tests/authProfiles.test.js`: testes HTTP de cadastro, login, sessão e permissões.

## Requisitos e configuração local

Use Node.js 20 ou superior e MySQL. Crie `backend/.env` a partir do exemplo e ajuste os valores para o banco local. Não versionar `.env` nem colocar segredos no frontend.

No PowerShell, na raiz do repositório:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
Set-Location backend
npm ci
npm test
npm run dev
```

O backend só começa a escutar depois de estabelecer a conexão MySQL. A API fica em `http://localhost:3000`; a rota `GET /health` indica que o servidor está respondendo, mas não substitui a confirmação da conexão com o banco no log de inicialização. Em `NODE_ENV=production`, o servidor exige configurações explícitas de banco, `CORS_ORIGINS` e um `JWT_SECRET` com pelo menos 32 caracteres.

Sirva o diretório `frontend` por um servidor estático local (por exemplo, Live Server em `http://localhost:5500`). Abrir as páginas por `file://` pode impedir as requisições da API. Para outra origem local, ajuste `CORS_ORIGINS` em `backend/.env`.

No painel administrativo, imagens de produto são escolhidas do dispositivo e enviadas à API em JPG, PNG ou WebP, com limite de 5 MB. O backend valida o conteúdo, gera um nome aleatório e armazena em `backend/uploads`; configure `PRODUCT_IMAGES_DIR` para apontar a um volume persistente no ambiente de produção. A pasta de uploads não é versionada.

## Banco de dados

As migrações não criam nem recriam o banco ou a tabela `usuarios`. Antes de executá-las, confirme que o schema `MBV_Shop` e a tabela `usuarios` existem e faça um backup. No MySQL Workbench, abra e execute `backend/database/migrations/001-add-usuario-perfil.sql` com o usuário de desenvolvimento. Se o schema tiver outro nome, ajuste o `USE MBV_Shop;` da migração antes de executá-la.

Depois de confirmar `SHOW CREATE TABLE usuarios` (especialmente o tipo de `usuarios.id`) e fazer um backup, execute `backend/database/migrations/002-create-commerce-tables.sql`. A migração cria categorias, produtos, variações, estoque, movimentações e pedidos e cadastra os oito produtos que já existiam na vitrine, sem duplicá-los quando executada novamente. Os produtos preservam preços, categorias e caminhos das imagens; como o estoque e as combinações reais de tamanho/cor não estavam registrados no projeto, as variações e quantidades **não são inventadas**. Cadastre as combinações reais e o estoque no painel antes de habilitar vendas. A migração verifica previamente se `usuarios.id` é `BIGINT UNSIGNED`, compatível com as colunas `usuario_id`; se o tipo for diferente, interrompe antes de criar as tabelas para que a migração possa ser ajustada com segurança.

Depois da migração 002, execute `backend/database/migrations/003-product-size-control.sql` para adicionar ao produto o controle de variação de tamanho. Produtos existentes com variações preservam o comportamento atual; acessórios existentes sem variações passam a não exigir tamanho. Ao cadastrar um produto na categoria Acessórios, o painel também desmarca tamanhos por padrão; o administrador pode ativá-los para anéis, pulseiras, meias e outros itens com medidas. Variações sem tamanho usam internamente o rótulo `Único`, que não é exibido como opção de tamanho na loja.

Para promover uma conta existente a administradora, substitua `SUBSTITUA_PELO_EMAIL_DO_PROPRIETARIO` em `backend/database/migrations/promote-user-to-admin.sql` pelo e-mail escolhido e execute o arquivo manualmente. Não existe endpoint público para conceder perfil administrativo.

## API atual

| Método | Caminho | Acesso | Uso |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Cadastro; o perfil é sempre `cliente` |
| `POST` | `/auth/login` | Público | Login; retorna JWT e perfil consultado no banco |
| `GET` | `/auth/me` | JWT | Retorna os dados e o perfil atual do usuário |
| `GET` | `/admin/teste` | JWT + `admin` | Verificação de autorização administrativa |
| `GET` | `/produtos` | Público | Lista produtos e variações de produtos ativos |
| `GET` | `/produtos/categorias` | Público | Lista categorias ativas |
| `GET` | `/admin/dashboard` | JWT + `admin` | Indicadores e movimentações recentes |
| `GET`, `POST`, `PUT`, `DELETE` | `/admin/produtos` e `/admin/produtos/:id` | JWT + `admin` | Cadastro e edição; exclusão exige produto inativo e sem pedidos ou histórico de estoque |
| `POST` | `/admin/produtos/:id/variacoes` | JWT + `admin` | Cria uma variação de tamanho/cor |
| `PUT`, `DELETE`, `PATCH` | `/admin/variacoes/:id` e `/admin/variacoes/:id/estoque` | JWT + `admin` | Edita variação, ajusta estoque ou remove variação sem estoque/histórico |
| `GET`, `POST`, `PUT`, `DELETE` | `/admin/categorias` | JWT + `admin` | Gerencia categorias; categorias com produtos não podem ser apagadas |
| `GET` | `/admin/movimentacoes` | JWT + `admin` | Consulta histórico de estoque |
| `GET`, `POST` | `/pedidos` | JWT | Cria pedido pendente e lista pedidos do próprio cliente |
| `GET`, `POST` | `/admin/pedidos` | JWT + `admin` | Lista pedidos e confirma pedidos pendentes |
| `GET` | `/health` | Público | Verificação básica de disponibilidade HTTP |

## Frontend publicado

`frontend/js/config.js` usa `http://localhost:3000` para desenvolvimento. Antes de publicar o frontend, altere `MBV_API_URL` para o endereço HTTPS real da API. Configure `CORS_ORIGINS` no backend com a origem exata do site publicado (sem caminho), separando várias origens por vírgula. Nenhum endereço de API ou valor no frontend é segredo.

O token é mantido em `localStorage` neste MVP; isso aumenta o impacto de uma eventual vulnerabilidade XSS. A autorização efetiva é sempre validada pelo backend. A API envia cabeçalhos básicos contra MIME sniffing e enquadramento, e impede cache de respostas de autenticação/administração. Para produção, usar HTTPS e revisar estratégia de sessão, política de segurança de conteúdo, proteção contra abuso e monitoramento.

## Pedidos, estoque e operação do painel

- O catálogo tenta consultar o MySQL e mantém os cards locais como fallback se a API estiver indisponível. A sacola existente continua em `localStorage`; os pedidos usam as variações e os preços atuais do banco, nunca os valores informados pelo navegador.
- A criação gera um pedido `pendente`, não processa pagamento e não reserva nem baixa estoque. A confirmação manual no painel registra a saída e atualiza o estoque numa transação com bloqueio de linhas; um pedido só pode ser confirmado uma vez. Uma chave de idempotência por conteúdo evita pedidos duplicados em tentativas repetidas.
- O painel só é exibido após `/auth/me` confirmar o perfil `admin`; cada endpoint administrativo também aplica autenticação e autorização no backend. Promoção de outros administradores continua restrita ao procedimento SQL existente.
- Para começar a vender, primeiro cadastre no painel as variações reais de tamanho/cor e faça os ajustes de estoque. Produtos legados permanecem visíveis, mas sem variações reais ficam indisponíveis para compra.
- A confirmação administrativa registra a decisão operacional e **não comprova pagamento**. Integrações reais de pagamento/frete, cancelamento e estorno de pedidos, rate limiting e controles de produção ainda precisam ser implementados antes de operar uma loja real.

Faça backup do banco, execute as migrações na ordem indicada e teste o ciclo completo com dados de desenvolvimento antes de publicar. A aplicação não foi conectada a um MySQL real nesta implementação; a migração ainda precisa ser validada no schema e na versão MySQL do ambiente.
