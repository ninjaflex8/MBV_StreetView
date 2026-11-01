const assert = require("node:assert/strict");
const { test } = require("node:test");

const variacoesInseridas = [];
const produtosInseridos = [];
const produtosExcluidos = [];
let proximoProdutoId = 1;
let consultaResumoDashboard = "";
let controlarTamanhoDaVariacao = true;
let tamanhosExistentes = [];
let produtoAtivoParaExclusao = 0;
let produtoTemHistorico = false;
const conexao = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, parametros) {
        if (/SELECT id, ativo FROM produtos WHERE id = \? FOR UPDATE/i.test(sql)) {
            return [[{ id: parametros[0], ativo: produtoAtivoParaExclusao }], []];
        }
        if (/SELECT id, controla_tamanho AS controlaTamanho FROM produtos/i.test(sql)) {
            return [[{ id: parametros[0], controlaTamanho: Number(controlarTamanhoDaVariacao) }], []];
        }
        if (/SELECT id FROM variacoes_produtos WHERE produto_id = \? FOR UPDATE/i.test(sql)) {
            return [tamanhosExistentes.map((_tamanho, index) => ({ id: index + 1 })), []];
        }
        if (/FROM variacoes_produtos v/i.test(sql) && /itens_pedido/i.test(sql)) {
            return [produtoTemHistorico ? [{ id: 1 }] : [], []];
        }
        if (/DELETE FROM variacoes_produtos WHERE produto_id/i.test(sql)) return [{ affectedRows: 1 }, []];
        if (/DELETE FROM produtos WHERE id = \? AND ativo = 0/i.test(sql)) {
            produtosExcluidos.push(parametros[0]);
            return [{ affectedRows: 1 }, []];
        }
        if (/SELECT id FROM produtos WHERE id = \? FOR UPDATE/i.test(sql)) {
            return [[{ id: parametros[0] }], []];
        }
        if (/SELECT tamanho, cor FROM variacoes_produtos WHERE produto_id/i.test(sql)) {
            return [tamanhosExistentes.map(tamanho => ({ tamanho, cor: "Preta" })), []];
        }
        if (/SELECT id FROM categorias/i.test(sql)) {
            return [[{ id: parametros[0] }], []];
        }
        if (/SELECT id FROM produtos WHERE slug/i.test(sql)) {
            return [[], []];
        }
        if (/INSERT INTO produtos/i.test(sql)) {
            produtosInseridos.push(parametros);
            return [{ insertId: proximoProdutoId++ }, []];
        }
        if (/INSERT INTO variacoes_produtos/i.test(sql)) {
            variacoesInseridas.push(parametros);
            return [{ insertId: variacoesInseridas.length }, []];
        }
        if (/INSERT INTO movimentacoes_estoque/i.test(sql)) return [{ insertId: 1 }, []];
        if (/UPDATE produtos SET/i.test(sql)) return [{ affectedRows: 1 }, []];
        throw new Error(`Consulta de teste inesperada: ${sql}`);
    }
};
const fakeDb = {
    promise() {
        return {
            getConnection: async () => conexao,
            async query(sql) {
                if (sql.includes("AS produtosSemEstoque")) {
                    consultaResumoDashboard = sql;
                    return [[{
                        produtos: "8",
                        produtosAtivos: "6",
                        estoqueBaixo: "2",
                        semEstoque: "3",
                        produtosSemEstoque: "4",
                        produtosEstoqueBaixo: "1",
                        unidadesDisponiveis: "26",
                        pedidos: "5",
                        pedidosPendentes: "2",
                        pedidosConfirmados: "3"
                    }], []];
                }
                if (sql.includes("FROM movimentacoes_estoque")) return [[], []];
                throw new Error(`Consulta de teste inesperada: ${sql}`);
            }
        };
    }
};
const dbPath = require.resolve("../database/connection");
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: fakeDb
};
const commerceController = require("../controllers/commerceController");

function requisicaoProduto(variacoes, controlaTamanho) {
    const body = {
        nome: "Produto de teste",
        descricao: "Descrição do produto de teste",
        preco: 55,
        categoriaId: 1,
        imagemUrl: "",
        ativo: true
    };
    if (controlaTamanho !== undefined) body.controlaTamanho = controlaTamanho;
    if (variacoes !== undefined) body.variacoes = variacoes;
    return {
        body,
        usuario: { id: 7 }
    };
}

function resposta() {
    return {
        codigo: 200,
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test("cadastra produto sem presumir variações ou estoque", async () => {
    const res = resposta();

    await commerceController.criarProduto(requisicaoProduto(), res);

    assert.equal(res.codigo, 201);
    assert.equal(produtosInseridos.at(-1).at(-1), 1);
    assert.equal(variacoesInseridas.length, 0);
});

test("permite cadastrar tamanho único com estoque inicial zero", async () => {
    const res = resposta();

    await commerceController.criarProduto(
        requisicaoProduto([{ tamanho: "Tamanho único", cor: "Preta", estoque: 0 }]),
        res
    );

    assert.equal(res.codigo, 201);
    assert.deepEqual(variacoesInseridas.at(-1), [2, "Tamanho único", "Preta", 0]);
});

test("persiste a escolha de não controlar tamanho em acessórios", async () => {
    const res = resposta();

    await commerceController.criarProduto(requisicaoProduto(undefined, false), res);

    assert.equal(res.codigo, 201);
    assert.equal(produtosInseridos.at(-1).at(-1), 0);
});

test("normaliza variações de produtos sem tamanho para tamanho único", async () => {
    const res = resposta();

    await commerceController.criarProduto(
        requisicaoProduto([{ tamanho: "M", cor: "Preta", estoque: 0 }], false),
        res
    );

    assert.equal(res.codigo, 201);
    assert.deepEqual(variacoesInseridas.at(-1), [4, "Único", "Preta", 0]);
});

test("cria variação de acessório sem exigir tamanho e registra o estoque", async () => {
    controlarTamanhoDaVariacao = false;
    const res = resposta();

    await commerceController.criarVariacao({
        params: { id: "3" },
        body: { cor: "Preta", estoque: 4 },
        usuario: { id: 7 }
    }, res);

    assert.equal(res.codigo, 201);
    assert.deepEqual(variacoesInseridas.at(-1), [3, "Único", "Preta", 4]);
    controlarTamanhoDaVariacao = true;
});

test("não desativa tamanhos se isso esconder variações existentes", async () => {
    tamanhosExistentes = ["M"];
    const res = resposta();

    await commerceController.atualizarProduto({
        params: { id: "3" },
        body: { controlaTamanho: false }
    }, res);

    assert.equal(res.codigo, 409);
    assert.match(res.body.message, /manter o estoque e o histórico/);
    tamanhosExistentes = [];
});

test("exclui produto inativo sem pedidos ou histórico", async () => {
    tamanhosExistentes = ["Único"];
    produtoAtivoParaExclusao = 0;
    produtoTemHistorico = false;
    const res = resposta();

    await commerceController.excluirProduto({ params: { id: "3" } }, res);

    assert.equal(res.codigo, 200);
    assert.deepEqual(produtosExcluidos.at(-1), 3);
    tamanhosExistentes = [];
});

test("impede excluir produto ativo ou com histórico vinculado", async () => {
    produtoAtivoParaExclusao = 1;
    let res = resposta();

    await commerceController.excluirProduto({ params: { id: "3" } }, res);
    assert.equal(res.codigo, 409);

    produtoAtivoParaExclusao = 0;
    tamanhosExistentes = ["Único"];
    produtoTemHistorico = true;
    res = resposta();
    const totalExclusoes = produtosExcluidos.length;

    await commerceController.excluirProduto({ params: { id: "3" } }, res);
    assert.equal(res.codigo, 409);
    assert.equal(produtosExcluidos.length, totalExclusoes);
    tamanhosExistentes = [];
    produtoTemHistorico = false;
});

test("dashboard retorna os indicadores de produtos, estoque e pedidos do banco", async () => {
    const res = resposta();

    await commerceController.dashboard({}, res);

    assert.equal(res.codigo, 200);
    assert.deepEqual(
        {
            produtos: res.body.resumo.produtos,
            produtosAtivos: res.body.resumo.produtosAtivos,
            produtosSemEstoque: res.body.resumo.produtosSemEstoque,
            produtosEstoqueBaixo: res.body.resumo.produtosEstoqueBaixo,
            unidadesDisponiveis: res.body.resumo.unidadesDisponiveis,
            pedidosPendentes: res.body.resumo.pedidosPendentes,
            pedidosConfirmados: res.body.resumo.pedidosConfirmados
        },
        {
            produtos: 8,
            produtosAtivos: 6,
            produtosSemEstoque: 4,
            produtosEstoqueBaixo: 1,
            unidadesDisponiveis: 26,
            pedidosPendentes: 2,
            pedidosConfirmados: 3
        }
    );
    assert.match(consultaResumoDashboard, /NOT EXISTS/);
    assert.match(consultaResumoDashboard, /SUM\(estoque\) BETWEEN 1 AND 5/);
});
