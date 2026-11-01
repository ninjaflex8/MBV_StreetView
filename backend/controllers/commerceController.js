const db = require("../database/connection");
const crypto = require("node:crypto");

function enviarErro(res, status, message) {
  return res.status(status).json({ message });
}

async function reverterTransacao(conn) {
  if (!conn) return;
  try {
    await conn.rollback();
  } catch (err) {
    console.error("Erro ao reverter transação:", err.code || err.message);
  }
}

function inteiroPositivo(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function criarSlug(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validarProduto(body, parcial = false) {
  const dados = body || {};
  const resultado = {};

  if (!parcial || Object.hasOwn(dados, "nome")) {
    if (typeof dados.nome !== "string" || dados.nome.trim().length < 3 || dados.nome.trim().length > 100) {
      return { erro: "O nome deve ter entre 3 e 100 caracteres." };
    }
    resultado.nome = dados.nome.trim();
  }

  if (!parcial || Object.hasOwn(dados, "descricao")) {
    if (dados.descricao != null && (typeof dados.descricao !== "string" || dados.descricao.length > 500)) {
      return { erro: "A descrição deve ter no máximo 500 caracteres." };
    }
    resultado.descricao = dados.descricao ? dados.descricao.trim() : null;
  }

  if (!parcial || Object.hasOwn(dados, "preco")) {
    const preco = Number(dados.preco);
    if (!Number.isFinite(preco) || preco <= 0 || !/^\d{1,8}(\.\d{1,2})?$/.test(String(dados.preco))) {
      return { erro: "Informe um preço maior que zero, com até duas casas decimais." };
    }
    resultado.preco = preco.toFixed(2);
  }

  if (!parcial || Object.hasOwn(dados, "categoriaId")) {
    if (!inteiroPositivo(dados.categoriaId)) {
      return { erro: "Selecione uma categoria válida." };
    }
    resultado.categoriaId = Number(dados.categoriaId);
  }

  if (!parcial || Object.hasOwn(dados, "imagemUrl")) {
    const imagemUrl = dados.imagemUrl == null ? "" : dados.imagemUrl;
    if (typeof imagemUrl !== "string" || imagemUrl.length > 500) {
      return { erro: "A URL da imagem deve ter no máximo 500 caracteres." };
    }
    if (imagemUrl) {
      try {
        const url = new URL(imagemUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("Protocolo não permitido.");
      } catch {
        return { erro: "Informe uma URL de imagem HTTP ou HTTPS válida." };
      }
    }
    resultado.imagemUrl = imagemUrl || null;
  }

  if (!parcial || Object.hasOwn(dados, "ativo")) {
    if (typeof dados.ativo !== "boolean") {
      return { erro: "O campo ativo deve ser verdadeiro ou falso." };
    }
    resultado.ativo = dados.ativo ? 1 : 0;
  }

  return { dados: resultado };
}

function validarVariacoes(variacoes) {
  if (!Array.isArray(variacoes) || variacoes.length > 100) {
    return { erro: "Informe no máximo 100 variações para o produto." };
  }

  const unicas = new Set();
  const resultado = [];
  for (const variacao of variacoes) {
    const tamanho = typeof variacao?.tamanho === "string" ? variacao.tamanho.trim() : "";
    const cor = typeof variacao?.cor === "string" ? variacao.cor.trim() : "";
    const estoque = variacao?.estoque;
    const chave = `${tamanho.toLocaleLowerCase("pt-BR")}\u0000${cor.toLocaleLowerCase("pt-BR")}`;
    if (!tamanho || tamanho.length > 30 || !cor || cor.length > 40) {
      return { erro: "Cada variação precisa de tamanho e cor válidos." };
    }
    if (!Number.isSafeInteger(estoque) || estoque < 0 || estoque > 1000000) {
      return { erro: "O estoque inicial deve ser um número inteiro entre 0 e 1.000.000." };
    }
    if (unicas.has(chave)) return { erro: "Não repita a combinação de tamanho e cor." };
    unicas.add(chave);
    resultado.push({ tamanho, cor, estoque });
  }
  return { dados: resultado };
}

async function carregarProdutos(query) {
  const [produtos] = await query;
  if (!produtos.length) return [];
  const ids = produtos.map((produto) => produto.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [variacoes] = await db.promise().query(
      `SELECT id, produto_id AS produtoId, tamanho, cor, estoque
       FROM variacoes_produtos
       WHERE produto_id IN (${placeholders})
       ORDER BY tamanho, cor`,
      ids
  );
  const porProduto = new Map(ids.map((id) => [Number(id), []]));
  variacoes.forEach((variacao) => {
    porProduto.get(Number(variacao.produtoId)).push({
      id: Number(variacao.id),
      tamanho: variacao.tamanho,
      cor: variacao.cor,
      estoque: Number(variacao.estoque)
    });
  });
  return produtos.map((produto) => ({
    id: Number(produto.id),
    nome: produto.nome,
    slug: produto.slug,
    descricao: produto.descricao,
    preco: Number(produto.preco),
    imagemUrl: produto.imagem_url,
    ativo: Boolean(produto.ativo),
    categoria: {
      id: Number(produto.categoria_id),
      nome: produto.categoria_nome,
      slug: produto.categoria_slug
    },
    variacoes: porProduto.get(Number(produto.id)) || []
  }));
}

exports.listarProdutos = async (req, res) => {
  try {
    const incluirInativos = req.usuario?.perfil === "admin" && req.query.todos === "true";
    const sql = `SELECT p.id, p.nome, p.slug, p.descricao, p.preco, p.imagem_url,
                        p.ativo, p.categoria_id, c.nome AS categoria_nome,
                        c.slug AS categoria_slug
                 FROM produtos p
                 JOIN categorias c ON c.id = p.categoria_id
                 ${incluirInativos ? "" : "WHERE p.ativo = 1 AND c.ativo = 1"}
                 ORDER BY p.criado_em DESC, p.id DESC`;
    const produtos = await carregarProdutos(db.promise().query(sql));
    return res.status(200).json({ produtos });
  } catch (err) {
    console.error("Erro ao listar produtos:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar os produtos.");
  }
};

exports.listarCategorias = async (_req, res) => {
  try {
    const [categorias] = await db.promise().query(
        `SELECT c.id, c.nome, c.slug, c.ativo,
                COUNT(p.id) AS quantidadeProdutos
         FROM categorias c
         LEFT JOIN produtos p ON p.categoria_id = c.id
         GROUP BY c.id
         ORDER BY c.nome`
    );
    return res.status(200).json({
      categorias: categorias.map((categoria) => ({
        id: Number(categoria.id),
        nome: categoria.nome,
        slug: categoria.slug,
        ativo: Boolean(categoria.ativo),
        quantidadeProdutos: Number(categoria.quantidadeProdutos)
      }))
    });
  } catch (err) {
    console.error("Erro ao listar categorias:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar as categorias.");
  }
};

exports.listarCategoriasPublicas = async (_req, res) => {
  try {
    const [categorias] = await db.promise().query(
        "SELECT id, nome, slug FROM categorias WHERE ativo = 1 ORDER BY nome"
    );
    return res.status(200).json({
      categorias: categorias.map((categoria) => ({
        id: Number(categoria.id),
        nome: categoria.nome,
        slug: categoria.slug
      }))
    });
  } catch (err) {
    console.error("Erro ao listar categorias públicas:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar as categorias.");
  }
};

exports.criarCategoria = async (req, res) => {
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  if (nome.length < 2 || nome.length > 80) {
    return enviarErro(res, 400, "O nome da categoria deve ter entre 2 e 80 caracteres.");
  }
  const slug = criarSlug(nome);
  if (!slug) return enviarErro(res, 400, "O nome da categoria precisa conter letras ou números.");
  try {
    const [result] = await db.promise().query(
        "INSERT INTO categorias (nome, slug) VALUES (?, ?)",
        [nome, slug]
    );
    return res.status(201).json({
      categoria: { id: result.insertId, nome, slug, ativo: true, quantidadeProdutos: 0 }
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Já existe uma categoria com esse nome.");
    console.error("Erro ao criar categoria:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível criar a categoria.");
  }
};

exports.atualizarCategoria = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de categoria inválido.");
  const nome = typeof req.body?.nome === "string" ? req.body.nome.trim() : "";
  const ativo = req.body?.ativo;
  if (nome.length < 2 || nome.length > 80 || typeof ativo !== "boolean") {
    return enviarErro(res, 400, "Informe um nome válido e o estado ativo da categoria.");
  }
  const slug = criarSlug(nome);
  if (!slug) return enviarErro(res, 400, "O nome da categoria precisa conter letras ou números.");
  try {
    const [result] = await db.promise().query(
        "UPDATE categorias SET nome = ?, slug = ?, ativo = ? WHERE id = ?",
        [nome, slug, ativo ? 1 : 0, Number(req.params.id)]
    );
    if (!result.affectedRows) return enviarErro(res, 404, "Categoria não encontrada.");
    return res.status(200).json({ message: "Categoria atualizada." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Já existe uma categoria com esse nome.");
    console.error("Erro ao atualizar categoria:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível atualizar a categoria.");
  }
};

exports.excluirCategoria = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de categoria inválido.");
  try {
    const [result] = await db.promise().query("DELETE FROM categorias WHERE id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) return enviarErro(res, 404, "Categoria não encontrada.");
    return res.status(200).json({ message: "Categoria removida." });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return enviarErro(res, 409, "A categoria possui produtos vinculados e não pode ser removida.");
    }
    console.error("Erro ao excluir categoria:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível remover a categoria.");
  }
};

exports.criarProduto = async (req, res) => {
  const validacao = validarProduto(req.body);
  if (validacao.erro) return enviarErro(res, 400, validacao.erro);
  const variacoesValidadas = validarVariacoes(
      req.body.variacoes === undefined ? [] : req.body.variacoes
  );
  if (variacoesValidadas.erro) return enviarErro(res, 400, variacoesValidadas.erro);

  const slugBase = criarSlug(validacao.dados.nome);
  if (!slugBase) return enviarErro(res, 400, "O nome do produto precisa conter letras ou números.");
  let conn;
  try {
    conn = await db.promise().getConnection();
    await conn.beginTransaction();
    const [categorias] = await conn.query(
        "SELECT id FROM categorias WHERE id = ? AND ativo = 1 FOR UPDATE",
        [validacao.dados.categoriaId]
    );
    if (!categorias.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 400, "A categoria selecionada não existe ou está inativa.");
    }
    const [existente] = await conn.query("SELECT id FROM produtos WHERE slug = ? LIMIT 1", [slugBase]);
    if (existente.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 409, "Já existe um produto com nome equivalente.");
    }
    const [produtoResult] = await conn.query(
        `INSERT INTO produtos
         (categoria_id, nome, slug, descricao, preco, imagem_url, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          validacao.dados.categoriaId,
          validacao.dados.nome,
          slugBase,
          validacao.dados.descricao,
          validacao.dados.preco,
          validacao.dados.imagemUrl,
          validacao.dados.ativo
        ]
    );
    for (const variacao of variacoesValidadas.dados) {
      const [variacaoResult] = await conn.query(
          "INSERT INTO variacoes_produtos (produto_id, tamanho, cor, estoque) VALUES (?, ?, ?, ?)",
          [produtoResult.insertId, variacao.tamanho, variacao.cor, variacao.estoque]
      );
      if (variacao.estoque > 0) {
        await conn.query(
            `INSERT INTO movimentacoes_estoque
             (variacao_id, usuario_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacao)
             VALUES (?, ?, 'entrada', ?, 0, ?, 'Estoque inicial do produto')`,
            [variacaoResult.insertId, req.usuario.id, variacao.estoque, variacao.estoque]
        );
      }
    }
    await conn.commit();
    return res.status(201).json({ message: "Produto cadastrado com sucesso.", id: produtoResult.insertId });
  } catch (err) {
    await reverterTransacao(conn);
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Já existe um produto ou variação equivalente.");
    console.error("Erro ao criar produto:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível cadastrar o produto.");
  } finally {
    if (conn) conn.release();
  }
};

exports.atualizarProduto = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de produto inválido.");
  const validacao = validarProduto(req.body, true);
  if (validacao.erro) return enviarErro(res, 400, validacao.erro);
  const campos = validacao.dados;
  if (!Object.keys(campos).length) return enviarErro(res, 400, "Informe ao menos um campo para atualizar.");
  if (campos.nome) {
    campos.slug = criarSlug(campos.nome);
    if (!campos.slug) return enviarErro(res, 400, "O nome do produto precisa conter letras ou números.");
  }
  const colunas = {
    nome: "nome",
    slug: "slug",
    descricao: "descricao",
    preco: "preco",
    categoriaId: "categoria_id",
    imagemUrl: "imagem_url",
    ativo: "ativo"
  };
  const entradas = Object.entries(campos);
  const sql = entradas.map(([chave]) => `${colunas[chave]} = ?`).join(", ");
  try {
    if (campos.categoriaId) {
      const [categorias] = await db.promise().query(
          "SELECT id FROM categorias WHERE id = ? AND ativo = 1",
          [campos.categoriaId]
      );
      if (!categorias.length) return enviarErro(res, 400, "A categoria selecionada não existe ou está inativa.");
    }
    const [result] = await db.promise().query(
        `UPDATE produtos SET ${sql} WHERE id = ?`,
        [...entradas.map(([, value]) => value), Number(req.params.id)]
    );
    if (!result.affectedRows) return enviarErro(res, 404, "Produto não encontrado ou sem alterações.");
    return res.status(200).json({ message: "Produto atualizado." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Já existe um produto com nome equivalente.");
    console.error("Erro ao atualizar produto:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível atualizar o produto.");
  }
};

exports.excluirProduto = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de produto inválido.");
  try {
    const [result] = await db.promise().query(
        "UPDATE produtos SET ativo = 0 WHERE id = ? AND ativo = 1",
        [Number(req.params.id)]
    );
    if (!result.affectedRows) return enviarErro(res, 404, "Produto não encontrado ou já desativado.");
    return res.status(200).json({ message: "Produto desativado; o histórico e os pedidos foram preservados." });
  } catch (err) {
    console.error("Erro ao desativar produto:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível desativar o produto.");
  }
};

exports.criarVariacao = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de produto inválido.");
  const validadas = validarVariacoes([req.body]);
  if (validadas.erro) return enviarErro(res, 400, validadas.erro);
  const variacao = validadas.dados[0];
  let conn;
  try {
    conn = await db.promise().getConnection();
    await conn.beginTransaction();
    const [produtos] = await conn.query("SELECT id FROM produtos WHERE id = ? FOR UPDATE", [Number(req.params.id)]);
    if (!produtos.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 404, "Produto não encontrado.");
    }
    const [result] = await conn.query(
        "INSERT INTO variacoes_produtos (produto_id, tamanho, cor, estoque) VALUES (?, ?, ?, ?)",
        [Number(req.params.id), variacao.tamanho, variacao.cor, variacao.estoque]
    );
    if (variacao.estoque > 0) {
      await conn.query(
          `INSERT INTO movimentacoes_estoque
           (variacao_id, usuario_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacao)
           VALUES (?, ?, 'entrada', ?, 0, ?, 'Estoque inicial da variação')`,
          [result.insertId, req.usuario.id, variacao.estoque, variacao.estoque]
      );
    }
    await conn.commit();
    return res.status(201).json({ id: result.insertId, ...variacao });
  } catch (err) {
    await reverterTransacao(conn);
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Essa combinação de tamanho e cor já existe.");
    console.error("Erro ao criar variação:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível criar a variação.");
  } finally {
    if (conn) conn.release();
  }
};

exports.atualizarVariacao = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de variação inválido.");
  const validadas = validarVariacoes([{ ...req.body, estoque: 0 }]);
  if (validadas.erro) return enviarErro(res, 400, validadas.erro);
  const { tamanho, cor } = validadas.dados[0];
  try {
    const [result] = await db.promise().query(
        "UPDATE variacoes_produtos SET tamanho = ?, cor = ? WHERE id = ?",
        [tamanho, cor, Number(req.params.id)]
    );
    if (!result.affectedRows) return enviarErro(res, 404, "Variação não encontrada ou sem alterações.");
    return res.status(200).json({ message: "Variação atualizada." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "Essa combinação de tamanho e cor já existe.");
    console.error("Erro ao atualizar variação:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível atualizar a variação.");
  }
};

exports.excluirVariacao = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de variação inválido.");
  try {
    const [result] = await db.promise().query(
        "DELETE FROM variacoes_produtos WHERE id = ? AND estoque = 0",
        [Number(req.params.id)]
    );
    if (!result.affectedRows) return enviarErro(res, 404, "Variação não encontrada ou com estoque diferente de zero.");
    return res.status(200).json({ message: "Variação removida." });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return enviarErro(res, 409, "A variação possui histórico ou pedidos vinculados e não pode ser removida.");
    }
    console.error("Erro ao excluir variação:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível remover a variação.");
  }
};

exports.ajustarEstoque = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de variação inválido.");
  const { tipo, quantidade, estoque, observacao } = req.body || {};
  if (!["entrada", "saida", "ajuste"].includes(tipo)) return enviarErro(res, 400, "Tipo de movimentação inválido.");
  const valor = tipo === "ajuste" ? estoque : quantidade;
  if (!Number.isSafeInteger(valor) || valor < (tipo === "ajuste" ? 0 : 1) || valor > 1000000) {
    return enviarErro(res, 400, "Informe uma quantidade inteira válida.");
  }
  if (observacao != null && (typeof observacao !== "string" || observacao.trim().length > 255)) {
    return enviarErro(res, 400, "A observação deve ter no máximo 255 caracteres.");
  }

  let conn;
  try {
    conn = await db.promise().getConnection();
    await conn.beginTransaction();
    const [variacoes] = await conn.query(
        "SELECT id, estoque FROM variacoes_produtos WHERE id = ? FOR UPDATE",
        [Number(req.params.id)]
    );
    if (!variacoes.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 404, "Variação não encontrada.");
    }
    const anterior = Number(variacoes[0].estoque);
    const posterior = tipo === "entrada"
        ? anterior + valor
        : tipo === "saida" ? anterior - valor : valor;
    if (posterior < 0) {
      await reverterTransacao(conn);
      return enviarErro(res, 409, "A retirada não pode deixar o estoque negativo.");
    }
    const quantidadeMovimentada = tipo === "ajuste" ? Math.abs(posterior - anterior) : valor;
    if (quantidadeMovimentada === 0) {
      await reverterTransacao(conn);
      return enviarErro(res, 400, "O ajuste não altera a quantidade atual.");
    }
    await conn.query("UPDATE variacoes_produtos SET estoque = ? WHERE id = ?", [posterior, Number(req.params.id)]);
    await conn.query(
        `INSERT INTO movimentacoes_estoque
         (variacao_id, usuario_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [Number(req.params.id), req.usuario.id, tipo, quantidadeMovimentada, anterior, posterior, observacao?.trim() || null]
    );
    await conn.commit();
    return res.status(200).json({ estoque: posterior });
  } catch (err) {
    await reverterTransacao(conn);
    console.error("Erro ao ajustar estoque:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível atualizar o estoque.");
  } finally {
    if (conn) conn.release();
  }
};

exports.dashboard = async (_req, res) => {
  try {
    const [resumo] = await db.promise().query(
        `SELECT
           (SELECT COUNT(*) FROM produtos) AS produtos,
           (SELECT COUNT(*) FROM produtos WHERE ativo = 1) AS produtosAtivos,
           (SELECT COUNT(*) FROM variacoes_produtos WHERE estoque BETWEEN 1 AND 5) AS estoqueBaixo,
           (SELECT COUNT(*) FROM variacoes_produtos WHERE estoque = 0) AS semEstoque,
           (SELECT COUNT(*) FROM produtos p
            WHERE NOT EXISTS (
              SELECT 1 FROM variacoes_produtos v
              WHERE v.produto_id = p.id AND v.estoque > 0
            )) AS produtosSemEstoque,
           (SELECT COUNT(*) FROM (
              SELECT produto_id
              FROM variacoes_produtos
              GROUP BY produto_id
              HAVING SUM(estoque) BETWEEN 1 AND 5
            ) AS produtos_baixo_estoque) AS produtosEstoqueBaixo,
           (SELECT COALESCE(SUM(estoque), 0) FROM variacoes_produtos) AS unidadesDisponiveis,
           (SELECT COUNT(*) FROM pedidos) AS pedidos,
           (SELECT COUNT(*) FROM pedidos WHERE status = 'pendente') AS pedidosPendentes,
           (SELECT COUNT(*) FROM pedidos WHERE status = 'confirmado') AS pedidosConfirmados`
    );
    const [movimentacoes] = await db.promise().query(
        `SELECT m.id, m.tipo, m.quantidade, m.estoque_anterior AS estoqueAnterior,
                m.estoque_posterior AS estoquePosterior, m.observacao, m.criado_em AS criadoEm,
                p.nome AS produto, v.tamanho, v.cor, u.nome AS responsavel
         FROM movimentacoes_estoque m
         JOIN variacoes_produtos v ON v.id = m.variacao_id
         JOIN produtos p ON p.id = v.produto_id
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         ORDER BY m.id DESC
         LIMIT 10`
    );
    const [r] = resumo;
    return res.status(200).json({
      resumo: Object.fromEntries(Object.entries(r).map(([key, value]) => [key, Number(value)])),
      movimentacoes
    });
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar o painel.");
  }
};

exports.listarMovimentacoes = async (_req, res) => {
  try {
    const [movimentacoes] = await db.promise().query(
        `SELECT m.id, m.tipo, m.quantidade, m.estoque_anterior AS estoqueAnterior,
                m.estoque_posterior AS estoquePosterior, m.observacao, m.criado_em AS criadoEm,
                p.nome AS produto, v.tamanho, v.cor, u.nome AS responsavel
         FROM movimentacoes_estoque m
         JOIN variacoes_produtos v ON v.id = m.variacao_id
         JOIN produtos p ON p.id = v.produto_id
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         ORDER BY m.id DESC
         LIMIT 100`
    );
    return res.status(200).json({ movimentacoes });
  } catch (err) {
    console.error("Erro ao listar movimentações:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar o histórico de estoque.");
  }
};

function centavos(valor) {
  const texto = String(valor);
  const [reais, centavosTexto = ""] = texto.split(".");
  return Number(reais) * 100 + Number((centavosTexto + "00").slice(0, 2));
}

exports.criarPedido = async (req, res) => {
  const itens = req.body?.itens;
  const chaveIdempotencia = req.body?.chaveIdempotencia;
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
    return enviarErro(res, 400, "Informe de 1 a 50 itens para criar o pedido.");
  }
  if (typeof chaveIdempotencia !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(chaveIdempotencia)) {
    return enviarErro(res, 400, "Chave de idempotência inválida.");
  }
  const quantidades = new Map();
  for (const item of itens) {
    if (!inteiroPositivo(item?.variacaoId) || !Number.isSafeInteger(item?.quantidade) || item.quantidade < 1 || item.quantidade > 99) {
      return enviarErro(res, 400, "Cada item deve ter uma variação e uma quantidade válida.");
    }
    const id = Number(item.variacaoId);
    quantidades.set(id, (quantidades.get(id) || 0) + item.quantidade);
    if (quantidades.get(id) > 99) return enviarErro(res, 400, "A quantidade máxima por variação é 99.");
  }
  const hashConteudo = crypto.createHash("sha256")
      .update(JSON.stringify([...quantidades.entries()].sort(([a], [b]) => a - b)))
      .digest("hex");

  let conn;
  try {
    conn = await db.promise().getConnection();
    await conn.beginTransaction();
    const [pedidosExistentes] = await conn.query(
        "SELECT id, status, total, hash_conteudo AS hashConteudo FROM pedidos WHERE usuario_id = ? AND chave_idempotencia = ? LIMIT 1 FOR UPDATE",
        [req.usuario.id, chaveIdempotencia]
    );
    if (pedidosExistentes.length) {
      await conn.commit();
      const existente = pedidosExistentes[0];
      if (existente.hashConteudo !== hashConteudo) {
        return enviarErro(res, 409, "A chave de idempotência já foi usada para outro conteúdo.");
      }
      return res.status(200).json({
        message: "Este pedido já havia sido recebido.",
        pedido: { id: existente.id, status: existente.status, total: Number(existente.total) }
      });
    }
    const ids = [...quantidades.keys()].sort((a, b) => a - b);
    const [variacoes] = await conn.query(
        `SELECT v.id, v.tamanho, v.cor, v.estoque, p.nome, p.preco
         FROM variacoes_produtos v
         JOIN produtos p ON p.id = v.produto_id
         JOIN categorias c ON c.id = p.categoria_id
         WHERE v.id IN (${ids.map(() => "?").join(", ")})
           AND p.ativo = 1 AND c.ativo = 1
         ORDER BY v.id
         FOR UPDATE`,
        ids
    );
    if (variacoes.length !== ids.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 409, "Um ou mais produtos não estão mais disponíveis.");
    }
    let totalCentavos = 0;
    for (const variacao of variacoes) {
      const quantidade = quantidades.get(Number(variacao.id));
      if (Number(variacao.estoque) < quantidade) {
        await reverterTransacao(conn);
        return enviarErro(res, 409, `Estoque insuficiente para ${variacao.nome} (${variacao.tamanho}, ${variacao.cor}).`);
      }
      totalCentavos += centavos(variacao.preco) * quantidade;
    }
    if (totalCentavos > 9999999999) {
      await reverterTransacao(conn);
      return enviarErro(res, 400, "O valor total ultrapassa o limite permitido para um pedido.");
    }
    const total = (totalCentavos / 100).toFixed(2);
    const [pedido] = await conn.query(
        `INSERT INTO pedidos
         (usuario_id, chave_idempotencia, hash_conteudo, status, subtotal, total)
         VALUES (?, ?, ?, 'pendente', ?, ?)`,
        [req.usuario.id, chaveIdempotencia, hashConteudo, total, total]
    );
    for (const variacao of variacoes) {
      await conn.query(
          `INSERT INTO itens_pedido
           (pedido_id, variacao_id, nome_produto, tamanho, cor, quantidade, preco_unitario)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pedido.insertId,
            variacao.id,
            variacao.nome,
            variacao.tamanho,
            variacao.cor,
            quantidades.get(Number(variacao.id)),
            variacao.preco
          ]
      );
    }
    await conn.commit();
    return res.status(201).json({
      message: "Pedido criado como pendente. Nenhum pagamento ou baixa de estoque foi realizado.",
      pedido: { id: pedido.insertId, status: "pendente", total: Number(total) }
    });
  } catch (err) {
    await reverterTransacao(conn);
    if (["ER_DUP_ENTRY", "ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(err.code)) {
      try {
        const [existentes] = await db.promise().query(
            "SELECT id, status, total, hash_conteudo AS hashConteudo FROM pedidos WHERE usuario_id = ? AND chave_idempotencia = ? LIMIT 1",
            [req.usuario.id, chaveIdempotencia]
        );
        if (existentes.length) {
          if (existentes[0].hashConteudo !== hashConteudo) {
            return enviarErro(res, 409, "A chave de idempotência já foi usada para outro conteúdo.");
          }
          return res.status(200).json({
            message: "Este pedido já havia sido recebido.",
            pedido: {
              id: existentes[0].id,
              status: existentes[0].status,
              total: Number(existentes[0].total)
            }
          });
        }
      } catch (lookupErr) {
        console.error("Erro ao verificar pedido idempotente:", lookupErr.code || lookupErr.message);
      }
    }
    console.error("Erro ao criar pedido:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível criar o pedido.");
  } finally {
    if (conn) conn.release();
  }
};

exports.listarPedidos = async (req, res) => {
  try {
    const admin = req.usuario.perfil === "admin";
    const [pedidos] = await db.promise().query(
        `SELECT p.id, p.usuario_id AS usuarioId, p.status, p.subtotal, p.total,
                p.criado_em AS criadoEm, u.nome AS cliente
         FROM pedidos p
         JOIN usuarios u ON u.id = p.usuario_id
         ${admin ? "" : "WHERE p.usuario_id = ?"}
         ORDER BY p.id DESC
         LIMIT 100`,
        admin ? [] : [req.usuario.id]
    );
    if (!pedidos.length) return res.status(200).json({ pedidos: [] });
    const ids = pedidos.map((pedido) => pedido.id);
    const [itens] = await db.promise().query(
        `SELECT pedido_id AS pedidoId, nome_produto AS produto, tamanho, cor,
                quantidade, preco_unitario AS precoUnitario
         FROM itens_pedido
         WHERE pedido_id IN (${ids.map(() => "?").join(", ")})
         ORDER BY pedido_id, id`,
        ids
    );
    const itensPorPedido = new Map(ids.map((id) => [Number(id), []]));
    itens.forEach((item) => itensPorPedido.get(Number(item.pedidoId)).push(item));
    return res.status(200).json({
      pedidos: pedidos.map((pedido) => ({
        ...pedido,
        total: Number(pedido.total),
        subtotal: Number(pedido.subtotal),
        itens: itensPorPedido.get(Number(pedido.id))
      }))
    });
  } catch (err) {
    console.error("Erro ao listar pedidos:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível carregar os pedidos.");
  }
};

exports.confirmarPedido = async (req, res) => {
  if (!inteiroPositivo(req.params.id)) return enviarErro(res, 400, "Identificador de pedido inválido.");
  let conn;
  try {
    conn = await db.promise().getConnection();
    await conn.beginTransaction();
    const [pedidos] = await conn.query("SELECT id, status FROM pedidos WHERE id = ? FOR UPDATE", [Number(req.params.id)]);
    if (!pedidos.length) {
      await reverterTransacao(conn);
      return enviarErro(res, 404, "Pedido não encontrado.");
    }
    if (pedidos[0].status !== "pendente") {
      await reverterTransacao(conn);
      return enviarErro(res, 409, "Somente pedidos pendentes podem ser confirmados.");
    }
    const [itens] = await conn.query(
        "SELECT variacao_id AS variacaoId, quantidade FROM itens_pedido WHERE pedido_id = ? ORDER BY variacao_id FOR UPDATE",
        [Number(req.params.id)]
    );
    for (const item of itens) {
      const [variacoes] = await conn.query(
          "SELECT estoque FROM variacoes_produtos WHERE id = ? FOR UPDATE",
          [item.variacaoId]
      );
      if (!variacoes.length || Number(variacoes[0].estoque) < Number(item.quantidade)) {
        await reverterTransacao(conn);
        return enviarErro(res, 409, "Estoque insuficiente para confirmar o pedido.");
      }
      const anterior = Number(variacoes[0].estoque);
      const quantidade = Number(item.quantidade);
      const posterior = anterior - quantidade;
      await conn.query("UPDATE variacoes_produtos SET estoque = ? WHERE id = ?", [posterior, item.variacaoId]);
      await conn.query(
          `INSERT INTO movimentacoes_estoque
           (variacao_id, usuario_id, pedido_id, tipo, quantidade, estoque_anterior, estoque_posterior, observacao)
           VALUES (?, ?, ?, 'saida_pedido', ?, ?, ?, 'Baixa na confirmação administrativa do pedido')`,
          [item.variacaoId, req.usuario.id, Number(req.params.id), quantidade, anterior, posterior]
      );
    }
    await conn.query("UPDATE pedidos SET status = 'confirmado' WHERE id = ?", [Number(req.params.id)]);
    await conn.commit();
    return res.status(200).json({ message: "Pedido confirmado e estoque atualizado.", status: "confirmado" });
  } catch (err) {
    await reverterTransacao(conn);
    if (err.code === "ER_DUP_ENTRY") return enviarErro(res, 409, "A baixa de estoque deste pedido já foi registrada.");
    console.error("Erro ao confirmar pedido:", err.code || err.message);
    return enviarErro(res, 500, "Não foi possível confirmar o pedido.");
  } finally {
    if (conn) conn.release();
  }
};
