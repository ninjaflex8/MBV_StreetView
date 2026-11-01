const assert = require("node:assert/strict");
const { test } = require("node:test");

const variacoesInseridas = [];
let proximoProdutoId = 1;
let consultaResumoDashboard = "";
const conexao = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, parametros) {
        if (/SELECT id FROM categorias/i.test(sql)) {
            return [[{ id: parametros[0] }], []];
        }
        if (/SELECT id FROM produtos WHERE slug/i.test(sql)) {
            return [[], []];
        }
        if (/INSERT INTO produtos/i.test(sql)) {
            return [{ insertId: proximoProdutoId++ }, []];
        }
        if (/INSERT INTO variacoes_produtos/i.test(sql)) {
            variacoesInseridas.push(parametros);
            return [{ insertId: variacoesInseridas.length }, []];
        }
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

function requisicaoProduto(variacoes) {
    const body = {
        nome: "Produto de teste",
        descricao: "Descrição do produto de teste",
        preco: 55,
        categoriaId: 1,
        imagemUrl: "",
        ativo: true
    };
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
