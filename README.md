# MBV StreetView

Loja virtual de streetwear com frontend estático em HTML, CSS e JavaScript, API de autenticação em Node.js/Express e persistência de usuários em MySQL.

## Funcionalidades atuais

- Catálogo estático com oito produtos, filtros por categoria e ordenação por preço ou nome.
- Sacola mantida no `localStorage`, com ajuste de quantidades, remoção de itens e cópia do resumo do pedido.
- Cadastro e login de usuários pela API.
- Senhas armazenadas com bcrypt e autenticação por JWT com validade de duas horas.
- Consulta de sessão autenticada em `GET /auth/me`.
- Layout responsivo com identidade visual branca e roxa.

O catálogo e os preços são definidos no frontend. A sacola ainda não cria pedidos no backend nem processa pagamentos, calcula frete ou reserva estoque.

## Tecnologias

- Frontend: HTML, CSS e JavaScript sem etapa de build.
- Backend: Node.js, Express, bcrypt, jsonwebtoken e mysql2.
- Banco de dados: MySQL.
- Publicação do frontend: GitHub Pages ou Netlify.

## Estrutura do projeto

```text
frontend/
  index.html                Página principal da loja
  css/style.css             Estilos e layout responsivo
  imagens/                  Imagens dos produtos e logotipo
  js/config.js              URL e cabeçalhos da API usados pelo frontend
  js/store.js               Catálogo, filtros e sacola local
  pages/areadelogin.html    Formulário de login
  pages/paginaderegistro.html Formulário de cadastro
backend/
  src/server.js             Inicialização da API e rota de saúde
  controllers/               Lógica de cadastro e login
  routes/authRoutes.js       Rotas de autenticação
  middleware/                Validação do JWT
  database/connection.js     Conexão MySQL
  package.json               Dependências e comandos do backend
.github/workflows/pages.yml  Publicação pelo GitHub Pages
netlify.toml                 Configuração de publicação pelo Netlify
```

## Requisitos

- Node.js e npm.
- MySQL acessível pelo backend.
- Um banco chamado `MBV_Shop` e uma tabela `usuarios` compatível com as consultas do projeto.

Os arquivos SQL existentes contêm consultas de exemplo; eles **não criam o banco nem a tabela**. Verifique o schema do seu MySQL antes de executar a API. A conexão espera as colunas `id`, `nome`, `email` e `senha`, com um índice único para `email`.

## Configuração e execução local

1. Crie `backend/.env` localmente. Não versione esse arquivo:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=seu_usuario_mysql
   DB_PASSWORD=sua_senha_mysql
   DB_NAME=MBV_Shop
   JWT_SECRET=gere_um_segredo_longo_e_aleatorio
   ```

   O backend tem valores padrão locais para `PORT`, host, porta, usuário e banco. Configure todas as variáveis explicitamente para outros ambientes. `JWT_SECRET` é obrigatório para emitir e validar tokens.

2. Instale as dependências e inicie o backend:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

   Para iniciar sem o modo de desenvolvimento, use `npm start`.

3. Confirme que a API está ativa acessando `http://localhost:3000/health`. A resposta esperada é:

   ```json
   { "status": "ok" }
   ```

   Essa rota verifica apenas se o servidor HTTP respondeu; não confirma a conexão com o MySQL.

4. Configure a URL da API em `frontend/js/config.js`. Para testar a loja localmente, use `http://localhost:3000` como URL base. O arquivo está atualmente configurado com um endereço de túnel ngrok de desenvolvimento; não o trate como endereço de produção.

5. Sirva a pasta `frontend/` com um servidor estático local e abra a página principal. O projeto não define um servidor de frontend nem uma etapa de build.

## API de autenticação

Todas as rotas abaixo são montadas sob `/auth`.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Cadastra usuário com nome de 3 a 30 caracteres, e-mail válido e senha de 6 a 50 caracteres. |
| `POST` | `/auth/login` | Público | Valida credenciais e retorna um JWT e os dados básicos do usuário. |
| `GET` | `/auth/me` | JWT obrigatório | Valida o token enviado como `Authorization: Bearer <token>`. |
| `GET` | `/auth/teste` | Público | Rota auxiliar de teste. |
| `GET` | `/health` | Público | Verifica se o servidor HTTP está ativo. |

O cadastro retorna `409` quando o e-mail já está registrado. Erros de validação retornam `400`; credenciais inválidas ou token ausente/inválido retornam `401`.

## Frontend e configuração da API

`frontend/js/config.js` define `window.MBV_API_URL` e cabeçalhos comuns usados pelo login, cadastro e validação da sessão. Para desenvolvimento, configure a URL para o backend local. Para uso público, substitua-a pelo endereço HTTPS de uma API publicada e configure essa API para aceitar requisições do domínio do frontend.

O endereço ngrok atualmente presente nessa configuração serve apenas para desenvolvimento e depende do túnel e do computador que executa o backend. O cabeçalho `ngrok-skip-browser-warning` existe para contornar a página de aviso do túnel gratuito; remova-o quando não usar ngrok.

O token e os dados básicos da sessão ficam no `localStorage` do navegador. A opção “Lembrar meu e-mail” também usa `localStorage`; não armazena a senha.

## Publicação

### GitHub Pages

O workflow `.github/workflows/pages.yml` publica `frontend/` em pushes para as branches `main` e `master`, ou quando executado manualmente em **Actions**. Nas configurações do repositório, defina GitHub Actions como origem de publicação do Pages. O backend Node.js e o MySQL não são publicados por esse workflow.

### Netlify

O `netlify.toml` define `frontend/` como diretório estático de publicação. O backend e o banco precisam ser hospedados separadamente. A URL da API no frontend deve apontar para um backend acessível publicamente por HTTPS.

## Limitações e próximos passos

- Não há criação de pedidos, pagamento, cálculo de frete ou estoque.
- Produtos e preços são estáticos no JavaScript e não vêm do MySQL.
- O schema do banco precisa ser criado/configurado fora dos scripts SQL atuais.
- Não há testes automatizados definidos nos scripts do `package.json`.
- A rota `/health` não testa a conexão com o banco.
- Antes de produção, configure uma URL HTTPS estável para a API, restrinja CORS aos domínios necessários e mantenha segredos apenas nas variáveis de ambiente do servidor.
