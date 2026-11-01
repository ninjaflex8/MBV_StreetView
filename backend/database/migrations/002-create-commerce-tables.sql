USE MBV_Shop;

DELIMITER $$

DROP PROCEDURE IF EXISTS mbv_migrate_commerce_20261031$$

CREATE PROCEDURE mbv_migrate_commerce_20261031()
BEGIN
    DECLARE tabela_usuarios INT DEFAULT 0;
    DECLARE coluna_perfil INT DEFAULT 0;
    DECLARE id_usuario_compativel INT DEFAULT 0;

    SELECT COUNT(*) INTO tabela_usuarios
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios';

    IF tabela_usuarios = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A tabela usuarios não existe em MBV_Shop; migração cancelada.';
    END IF;

    SELECT COUNT(*) INTO coluna_perfil
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'perfil';

    IF coluna_perfil = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Execute primeiro a migração 001-add-usuario-perfil.sql.';
    END IF;

    SELECT COUNT(*) INTO id_usuario_compativel
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'id'
      AND data_type = 'bigint'
      AND column_type LIKE '%unsigned%';

    IF id_usuario_compativel = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'usuarios.id precisa ser BIGINT UNSIGNED; ajuste as colunas usuario_id da migração antes de executá-la.';
    END IF;

    CREATE TABLE IF NOT EXISTS categorias (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        nome VARCHAR(80) NOT NULL,
        slug VARCHAR(90) NOT NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_categorias_slug (slug),
        UNIQUE KEY uq_categorias_nome (nome)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS produtos (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        categoria_id INT UNSIGNED NOT NULL,
        nome VARCHAR(100) NOT NULL,
        slug VARCHAR(120) NOT NULL,
        descricao VARCHAR(500) NULL,
        preco DECIMAL(10,2) NOT NULL,
        imagem_url VARCHAR(500) NULL,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_produtos_slug (slug),
        KEY ix_produtos_categoria_ativo (categoria_id, ativo),
        CONSTRAINT fk_produtos_categoria FOREIGN KEY (categoria_id)
            REFERENCES categorias (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_produtos_preco CHECK (preco > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS variacoes_produtos (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        produto_id INT UNSIGNED NOT NULL,
        tamanho VARCHAR(30) NOT NULL,
        cor VARCHAR(40) NOT NULL,
        estoque INT UNSIGNED NOT NULL DEFAULT 0,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_variacao_produto_tamanho_cor (produto_id, tamanho, cor),
        KEY ix_variacoes_estoque (estoque),
        CONSTRAINT fk_variacoes_produto FOREIGN KEY (produto_id)
            REFERENCES produtos (id) ON UPDATE CASCADE ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS pedidos (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        usuario_id BIGINT UNSIGNED NOT NULL,
        chave_idempotencia CHAR(36) NULL,
        hash_conteudo CHAR(64) NULL,
        status ENUM('pendente', 'confirmado', 'cancelado') NOT NULL DEFAULT 'pendente',
        subtotal DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_pedidos_usuario_idempotencia (usuario_id, chave_idempotencia),
        KEY ix_pedidos_usuario_data (usuario_id, criado_em),
        KEY ix_pedidos_status_data (status, criado_em),
        CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id)
            REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_pedidos_totais CHECK (subtotal >= 0 AND total >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS itens_pedido (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        pedido_id BIGINT UNSIGNED NOT NULL,
        variacao_id INT UNSIGNED NOT NULL,
        nome_produto VARCHAR(100) NOT NULL,
        tamanho VARCHAR(30) NOT NULL,
        cor VARCHAR(40) NOT NULL,
        quantidade INT UNSIGNED NOT NULL,
        preco_unitario DECIMAL(10,2) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_item_pedido_variacao (pedido_id, variacao_id),
        CONSTRAINT fk_itens_pedido_pedido FOREIGN KEY (pedido_id)
            REFERENCES pedidos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_itens_pedido_variacao FOREIGN KEY (variacao_id)
            REFERENCES variacoes_produtos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_item_quantidade CHECK (quantidade > 0),
        CONSTRAINT chk_item_preco CHECK (preco_unitario > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        variacao_id INT UNSIGNED NOT NULL,
        usuario_id BIGINT UNSIGNED NULL,
        pedido_id BIGINT UNSIGNED NULL,
        tipo ENUM('entrada', 'saida', 'ajuste', 'saida_pedido') NOT NULL,
        quantidade INT UNSIGNED NOT NULL,
        estoque_anterior INT UNSIGNED NOT NULL,
        estoque_posterior INT UNSIGNED NOT NULL,
        observacao VARCHAR(255) NULL,
        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_movimentacao_pedido_variacao_tipo (pedido_id, variacao_id, tipo),
        KEY ix_movimentacoes_data (criado_em),
        KEY ix_movimentacoes_variacao_data (variacao_id, criado_em),
        CONSTRAINT fk_movimentacoes_variacao FOREIGN KEY (variacao_id)
            REFERENCES variacoes_produtos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_movimentacoes_usuario FOREIGN KEY (usuario_id)
            REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_movimentacoes_pedido FOREIGN KEY (pedido_id)
            REFERENCES pedidos (id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT chk_movimentacao_quantidade CHECK (quantidade > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
END$$

CALL mbv_migrate_commerce_20261031()$$
DROP PROCEDURE mbv_migrate_commerce_20261031$$

DELIMITER ;

INSERT IGNORE INTO categorias (nome, slug) VALUES
    ('Camisetas', 'camisetas'),
    ('Acessórios', 'acessorios'),
    ('Jaquetas', 'jaquetas');

INSERT IGNORE INTO produtos
    (categoria_id, nome, slug, descricao, preco, imagem_url, ativo)
SELECT c.id, seed.nome, seed.slug, seed.descricao, seed.preco, seed.imagem_url, 1
FROM (
    SELECT 'Camiseta Pain' AS nome, 'pain' AS slug,
           'Modelagem confortável com estampa exclusiva para looks urbanos.' AS descricao,
           55.00 AS preco, 'imagens/camisa_pain.jpg' AS imagem_url, 'camisetas' AS categoria
    UNION ALL SELECT 'Camiseta do Brooklyn', 'brooklyn',
           'Tecido premium, caimento moderno e estampa inspirada na cena de rua.',
           65.00, 'imagens/camisa_brooklyn.jpg', 'camisetas'
    UNION ALL SELECT 'Camiseta Galaxy', 'galaxy',
           'Estampa artística exclusiva com acabamento reforçado.',
           75.00, 'imagens/camisa_desenho_coasta.jpg', 'camisetas'
    UNION ALL SELECT 'Camiseta Anjelical', 'anjelical',
           'Peça limitada com detalhes bordados e acabamento premium.',
           85.00, 'imagens/camisa_anjo.jpg', 'camisetas'
    UNION ALL SELECT 'Boné Street', 'bone-street',
           'Boné com aba curva e bordado exclusivo MBV.',
           49.00, 'imagens/bone_street.jpg', 'acessorios'
    UNION ALL SELECT 'Boné Ossos', 'bone-ossos',
           'Boné com aba curva e bordado exclusivo MBV.',
           49.00, 'imagens/bone_bones.jpg', 'acessorios'
    UNION ALL SELECT 'Jaqueta Nike', 'jaqueta-nike',
           'Jaqueta leve, resistente à água e com design urbano.',
           199.00, 'imagens/jaqueta_nike.jpg', 'jaquetas'
    UNION ALL SELECT 'Camiseta Zoro One Piece', 'zoro',
           'Camiseta confortável com estampa exclusiva de personagem.',
           59.00, 'imagens/camisa_onepiace.jpg', 'camisetas'
) AS seed
JOIN categorias c ON c.slug = seed.categoria;
