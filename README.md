# MBV StreetView

**Uma loja, uma marca e um projeto feito com vontade de aprender construindo algo real.**

A MBV StreetView é meu projeto pessoal de uma loja virtual de roupas e acessórios. A ideia é criar uma experiência de compra simples e familiar para quem visita a loja e, ao mesmo tempo, desenvolver uma ferramenta que me permita cuidar dos produtos e do estoque sem depender de alterações manuais no banco de dados.

Mais do que uma vitrine, este projeto reúne as partes que fazem uma loja funcionar: catálogo, detalhes dos produtos, sacola, contas de clientes, pedidos e um painel administrativo. Estou construindo tudo por etapas, preservando o que já funciona e aprendendo com cada melhoria.

## A experiência da loja

Na vitrine, o cliente pode explorar os produtos e usar os filtros disponíveis. Ao escolher **Ver produto**, acessa uma página com as informações e as opções disponíveis — como tamanho, cor e quantidade — antes de adicionar o item à sacola. A sacola existente é mantida no navegador, e o estoque é conferido pelo sistema.

A área administrativa é separada da loja. Nela, uma conta autorizada pode gerenciar produtos, categorias, variações, imagens e estoque, além de consultar pedidos e movimentações. O acesso é verificado no backend; esconder uma página ou botão no navegador não substitui essa proteção.

O visual segue a identidade da MBV: tons de creme, branco e carvão, com detalhes em verde-oliva. A intenção é manter a navegação clara, acolhedora e familiar, sem sobrecarregar a experiência.

## O que o projeto usa

- **Loja:** HTML, CSS e JavaScript.
- **Servidor e API:** Node.js, Express e CommonJS.
- **Dados:** MySQL com `mysql2`.
- **Contas:** JWT e senhas protegidas com bcrypt.

O código está dividido entre `frontend/` e `backend/`. A loja e o painel usam a API existente; o painel não é um sistema separado nem cria uma segunda sacola.

## Rodar localmente

É necessário ter Node.js 20 ou superior e um MySQL disponível. Na raiz do projeto, no PowerShell:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
Set-Location backend
npm ci
npm test
npm run dev
```

Antes de iniciar o servidor, configure as credenciais do banco e as demais variáveis necessárias em `backend/.env`. Não compartilhe nem envie esse arquivo ao GitHub.

Sirva a pasta `frontend` com um servidor local, por exemplo, o Live Server do VS Code. A configuração de desenvolvimento aponta para `http://localhost:3000`; abrir as páginas diretamente por `file://` pode impedir a comunicação com a API.

## Banco e primeiro acesso administrativo

As migrações estão em `backend/database/migrations/`. Elas pressupõem que o banco `MBV_Shop` e a tabela `usuarios` já existam. Faça backup e confira o schema antes de executá-las, na ordem:

1. `001-add-usuario-perfil.sql`
2. `002-create-commerce-tables.sql`
3. `003-product-size-control.sql`

As combinações de tamanho, cor e estoque precisam corresponder aos produtos reais; o sistema não inventa essas informações. Cadastre-as no painel antes de disponibilizar os produtos para compra.

Para conceder acesso administrativo, use `promote-user-to-admin.sql` somente após substituir o campo indicado pelo e-mail da conta existente que deve receber a permissão. O cadastro público cria clientes e não concede acesso de administrador.

## Em desenvolvimento

O fluxo de pedidos registra solicitações pendentes, mas **não processa pagamentos**. A confirmação no painel representa uma ação operacional e atualiza o estoque; não comprova que um pagamento foi recebido. Integrações reais de pagamento e frete e a preparação do ambiente de produção ainda precisam ser feitas antes de operar uma loja real.

Para publicar, configure a URL HTTPS da API em `frontend/js/config.js`, defina as origens permitidas pelo backend e use armazenamento persistente para imagens. Também é necessário validar as migrações no MySQL do ambiente de destino. Até lá, o projeto deve ser tratado como uma aplicação em desenvolvimento.
