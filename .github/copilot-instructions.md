# MBV STREETVIEW — INSTRUÇÕES PARA GITHUB COPILOT

## 1. CONTEXTO DO PROJETO

O MBV StreetView é uma loja virtual de roupas e acessórios.

O objetivo é desenvolver uma aplicação de comércio eletrônico funcional, segura, organizada e preparada para expansão.

### Tecnologias utilizadas

**Frontend**
- HTML5
- CSS3
- JavaScript puro

**Backend**
- Node.js
- Express
- CommonJS

**Banco de dados**
- MySQL
- mysql2

**Autenticação e segurança**
- JWT
- bcrypt
- Variáveis de ambiente com dotenv

Não introduza frameworks ou bibliotecas adicionais sem necessidade técnica justificada.

## 2. REGRA PRINCIPAL: PRESERVAR O PROJETO EXISTENTE

Antes de realizar qualquer alteração:

1. Analise os arquivos existentes.
2. Identifique a arquitetura e as dependências utilizadas.
3. Verifique como as funcionalidades atuais estão implementadas.
4. Reutilize componentes e funções existentes quando apropriado.
5. Identifique possíveis impactos das alterações.

Nunca substitua arquivos inteiros sem necessidade.

Nunca recrie funcionalidades que já existem.

Nunca apague código funcional apenas para simplificar a implementação.

Priorize alterações incrementais, mantendo a compatibilidade com o restante do projeto.

## 3. PADRÃO DE CÓDIGO

Todo código deverá seguir estas diretrizes:

- Utilize nomes de variáveis e funções claros.
- Mantenha uma responsabilidade específica para cada arquivo.
- Evite funções excessivamente grandes.
- Evite duplicação de código.
- Utilize async/await quando apropriado.
- Trate erros de forma consistente.
- Utilize consultas SQL parametrizadas.
- Mantenha a organização entre rotas, controllers, middlewares e banco de dados.
- Comente somente trechos que realmente necessitem de explicação.
- Não utilize soluções improvisadas quando existir uma abordagem mais segura e sustentável.

O código deve ser profissional, mas também compreensível para um desenvolvedor em formação que precisará manter e explicar o projeto.

## 4. ARQUITETURA DO BACKEND

Respeite a separação de responsabilidades:

**Routes**
- Definem os endpoints.
- Aplicam os middlewares necessários.
- Direcionam as requisições aos controllers.

**Controllers**
- Processam as requisições.
- Executam as regras de negócio.
- Retornam respostas HTTP.

**Middleware**
- Autentica usuários.
- Verifica permissões.
- Executa validações compartilhadas.

**Database**
- Centraliza a conexão com o MySQL.
- Mantém o acesso ao banco organizado.

Não coloque toda a lógica da aplicação diretamente em `server.js`.

Mantenha o padrão CommonJS já utilizado no backend.

## 5. AUTENTICAÇÃO E AUTORIZAÇÃO

O sistema deverá trabalhar com dois perfis:

- `cliente`
- `admin`

### Regras obrigatórias

1. Todo cadastro público cria um usuário com perfil `cliente`.
2. O frontend nunca determina o perfil de um usuário.
3. O backend nunca confia em informações de autorização enviadas pelo cliente.
4. A promoção de usuários a administrador deve ocorrer por procedimento controlado.
5. Toda rota administrativa precisa validar autenticação e autorização.
6. Clientes não podem acessar endpoints administrativos.
7. Senhas devem ser armazenadas com bcrypt.
8. Tokens JWT devem possuir validade definida.
9. Nunca retornar senhas ou hashes nas respostas da API.

Sempre que necessário, consulte o perfil atualizado do usuário no banco de dados.

Não dependa exclusivamente do perfil armazenado no JWT, pois permissões podem ser alteradas.

Utilize respostas HTTP adequadas:
- `200`: operação concluída.
- `201`: recurso criado.
- `400`: requisição inválida.
- `401`: autenticação ausente ou inválida.
- `403`: usuário autenticado sem permissão.
- `404`: recurso não encontrado.
- `409`: conflito de dados.
- `500`: erro interno.

## 6. BANCO DE DADOS

Utilize MySQL como banco de dados principal.

Diretrizes:

- Preserve os registros existentes.
- Não recrie o banco sem autorização.
- Não apague tabelas ou colunas existentes sem justificativa.
- Utilize chaves primárias e estrangeiras adequadamente.
- Defina restrições de integridade.
- Utilize índices quando necessário.
- Utilize consultas parametrizadas.
- Utilize transações em operações que alterem múltiplos registros relacionados.

Antes de modificar o esquema, analise a estrutura atual.

Toda alteração estrutural deverá possuir uma migração SQL documentada.

## 7. SISTEMA DE PRODUTOS E ESTOQUE

O sistema deverá evoluir para oferecer:

- Cadastro de produtos.
- Edição de produtos.
- Exclusão controlada de produtos.
- Categorias.
- Imagens dos produtos.
- Variações por tamanho e cor.
- Controle de estoque por variação.
- Histórico de movimentações.
- Entrada e saída manual de estoque.
- Baixa automática após confirmação da compra.

### Regras de estoque

1. Cada variação deverá possuir seu próprio controle de estoque.
2. O estoque não poderá ficar negativo.
3. Adicionar produtos à sacola não deverá descontar unidades.
4. Compras confirmadas deverão gerar movimentações de saída.
5. Ajustes manuais deverão ser realizados somente por administradores.
6. Toda alteração de estoque deverá possuir histórico.
7. Operações concorrentes deverão utilizar transações e mecanismos adequados de bloqueio no MySQL.
8. O sistema deverá evitar vender a mesma unidade para dois clientes.
9. Não simule pagamentos ou confirmações que ainda não estejam integrados a um serviço real.

## 8. PAINEL ADMINISTRATIVO

O painel administrativo deverá ser separado da experiência normal do cliente.

Somente usuários com perfil `admin` poderão acessá-lo.

Funcionalidades previstas:

- Dashboard.
- Gerenciamento de produtos.
- Gerenciamento de categorias.
- Gerenciamento de variações.
- Controle de estoque.
- Histórico de movimentações.
- Gerenciamento de pedidos.
- Gerenciamento de administradores, com controles de segurança.

Não confie em esconder botões ou páginas no frontend como mecanismo de segurança.

A autorização deverá ser obrigatoriamente aplicada no backend.

## 9. FRONTEND

O frontend utiliza HTML, CSS e JavaScript puro.

Diretrizes:

- Preserve a identidade visual existente.
- Mantenha o padrão branco com detalhes roxos.
- Priorize responsividade.
- Evite duplicação de CSS e JavaScript.
- Organize os scripts por funcionalidade.
- Mantenha a navegação intuitiva.
- Não misture lógica de apresentação com regras críticas de negócio.

O frontend poderá ocultar opções conforme o perfil do usuário, mas isso será apenas uma melhoria de interface.

A segurança real deverá estar no backend.

Nunca exponha:
- Senhas.
- Segredos JWT.
- Credenciais do banco.
- Arquivos `.env`.
- Chaves privadas.

## 10. API E INTEGRAÇÕES

Mantenha os endpoints organizados e consistentes.

Utilize métodos HTTP adequados:

- GET: consultar.
- POST: criar ou executar uma operação.
- PUT/PATCH: atualizar.
- DELETE: excluir.

Valide os dados recebidos em todas as requisições.

Não aceite identificadores, preços, permissões ou quantidades sem validação no servidor.

Os valores financeiros deverão ser calculados e conferidos no backend, nunca confiando exclusivamente nos valores enviados pelo frontend.

## 11. CONFIGURAÇÕES E AMBIENTE

Utilize variáveis de ambiente para configurações sensíveis.

Nunca coloque credenciais diretamente no código.

Não altere o `.env` sem necessidade.

Não envie `.env` para o GitHub.

Respeite o `.gitignore`.

Diferencie claramente configurações de desenvolvimento e produção.

Não confunda URLs temporárias de desenvolvimento, como túneis ngrok, com endereços definitivos de produção.

## 12. TESTES E VALIDAÇÃO

Toda implementação deverá ser validada.

Antes de considerar uma tarefa concluída:

1. Verifique erros de sintaxe.
2. Verifique imports e caminhos.
3. Verifique dependências.
4. Verifique a comunicação entre frontend, backend e banco.
5. Teste os fluxos principais.
6. Teste respostas de erro.
7. Teste permissões e autenticação.
8. Verifique se funcionalidades anteriores continuam funcionando.

Não afirme que um teste passou se ele não foi executado.

Informe claramente o que foi testado e o que ainda precisa ser validado manualmente.

## 13. COMO EXECUTAR ALTERAÇÕES

Sempre trabalhe em etapas.

Antes de implementar:
- Analise o problema.
- Identifique os arquivos envolvidos.
- Apresente um plano objetivo.
- Identifique riscos e dependências.

Durante a implementação:
- Modifique somente os arquivos necessários.
- Preserve funcionalidades existentes.
- Evite alterações fora do escopo.
- Não introduza dependências sem justificativa.

Ao finalizar:
- Liste os arquivos criados.
- Liste os arquivos modificados.
- Explique cada alteração.
- Informe comandos para executar.
- Informe migrações necessárias.
- Informe testes realizados.
- Informe pendências e limitações.

Não considere uma tarefa concluída apenas porque o código foi escrito.

## 14. PRIORIDADE DAS DECISÕES

Em caso de conflito entre soluções, siga esta ordem:

1. Segurança.
2. Integridade dos dados.
3. Funcionamento correto.
4. Compatibilidade com o projeto existente.
5. Organização e manutenção.
6. Desempenho.
7. Aparência e conveniência.

Nunca sacrifique segurança ou integridade dos dados para facilitar a implementação.

## 15. REGRA FINAL

O objetivo não é apenas produzir código que funcione momentaneamente.

O objetivo é construir uma loja virtual real, organizada, segura, escalável e que possa ser mantida e evoluída sem precisar reescrever sua estrutura a cada nova funcionalidade.

Sempre investigue antes de modificar, implemente com responsabilidade e valide antes de considerar concluído.