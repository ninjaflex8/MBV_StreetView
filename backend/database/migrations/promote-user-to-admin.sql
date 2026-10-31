USE MBV_Shop;

-- Substitua pelo e-mail da conta existente que deve ser promovida.
SET @email_admin = 'SUBSTITUA_PELO_EMAIL_DO_PROPRIETARIO';

UPDATE usuarios
SET perfil = 'admin'
WHERE email = @email_admin;

SELECT ROW_COUNT() AS contas_promovidas;
