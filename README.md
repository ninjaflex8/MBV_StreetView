# MBV StreetView

Loja estática em HTML, CSS e JavaScript, com API de autenticação em Node.js/Express e conexão MySQL.

## Estrutura
- `frontend/index.html`: entrada da loja para publicação estática.
- `frontend/pages`: páginas de loja, cadastro e login existentes.
- `frontend/css/style.css`: design system e estilos responsivos.
- `frontend/js/store.js`: filtros, ordenação e sacola local.
- `backend/src/server.js`: servidor Express.
- `backend/controllers`: controladores de autenticação.
- `backend/database/connection.js`: conexão MySQL via variáveis de ambiente.

## Publicação estática
O `netlify.toml` publica `frontend/`. Não há etapa de build para o front-end.

## Backend
Requer Node.js e MySQL. Na pasta `backend`, copie `.env` para `.env`, preencha as variáveis de conexão do seu ambiente e execute:
- `npm install`
- `npm run dev` para desenvolvimento
- `npm start` para execução normal

A tabela `usuarios` precisa existir no banco `MBV_Shop` para os endpoints de autenticação funcionarem.

## Limites funcionais atuais
A sacola é persistida no navegador e permite alterar quantidades, remover itens e copiar o resumo do pedido. Ela **não** processa pagamento, calcula frete, reserva estoque nem cria pedidos no servidor. Não há integração de checkout identificada no código recebido. Os links de contato existentes foram preservados e devem ser confirmados pelo responsável da loja antes da publicação.
