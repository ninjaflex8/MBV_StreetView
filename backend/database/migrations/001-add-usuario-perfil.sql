USE MBV_Shop;

DELIMITER $$

DROP PROCEDURE IF EXISTS mbv_migrate_usuarios_perfil_20261031$$

CREATE PROCEDURE mbv_migrate_usuarios_perfil_20261031()
BEGIN
    DECLARE tabela_existe INT DEFAULT 0;
    DECLARE coluna_existe INT DEFAULT 0;
    DECLARE valores_invalidos INT DEFAULT 0;

    SELECT COUNT(*) INTO tabela_existe
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios';

    IF tabela_existe = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A tabela usuarios não existe em MBV_Shop; migração cancelada.';
    END IF;

    SELECT COUNT(*) INTO coluna_existe
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'usuarios'
      AND column_name = 'perfil';

    IF coluna_existe = 0 THEN
        ALTER TABLE usuarios
            ADD COLUMN perfil ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente';
    ELSE
        SELECT COUNT(*) INTO valores_invalidos
        FROM usuarios
        WHERE perfil IS NOT NULL
          AND perfil NOT IN ('cliente', 'admin');

        IF valores_invalidos > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'A coluna perfil contém valores inesperados; revise os dados antes da migração.';
        END IF;

        UPDATE usuarios
        SET perfil = 'cliente'
        WHERE perfil IS NULL;

        ALTER TABLE usuarios
            MODIFY COLUMN perfil ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente';
    END IF;
END$$

DELIMITER ;

CALL mbv_migrate_usuarios_perfil_20261031();
DROP PROCEDURE mbv_migrate_usuarios_perfil_20261031;
