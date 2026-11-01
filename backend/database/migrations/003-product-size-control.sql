USE MBV_Shop;

DELIMITER $$

DROP PROCEDURE IF EXISTS mbv_migrate_product_size_control_20261101$$

CREATE PROCEDURE mbv_migrate_product_size_control_20261101()
BEGIN
    DECLARE tabela_produtos INT DEFAULT 0;
    DECLARE coluna_controla_tamanho INT DEFAULT 0;

    SELECT COUNT(*) INTO tabela_produtos
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'produtos';

    IF tabela_produtos = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A tabela produtos não existe; execute primeiro a migração 002-create-commerce-tables.sql.';
    END IF;

    SELECT COUNT(*) INTO coluna_controla_tamanho
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'produtos'
      AND column_name = 'controla_tamanho';

    IF coluna_controla_tamanho = 0 THEN
        ALTER TABLE produtos
            ADD COLUMN controla_tamanho TINYINT(1) NOT NULL DEFAULT 1
            AFTER ativo;

        UPDATE produtos p
        JOIN categorias c ON c.id = p.categoria_id
        SET p.controla_tamanho = 0
        WHERE c.slug = 'acessorios'
          AND NOT EXISTS (
              SELECT 1
              FROM variacoes_produtos v
              WHERE v.produto_id = p.id
          );
    END IF;
END$$

CALL mbv_migrate_product_size_control_20261101()$$
DROP PROCEDURE mbv_migrate_product_size_control_20261101$$

DELIMITER ;
