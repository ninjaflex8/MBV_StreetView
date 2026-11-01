USE MBV_Shop;

-- Promove a conta existente do proprietário; o cadastro público segue criando clientes.
SET @email_admin = 'marcosepifanio13@gmail.com';

UPDATE usuarios
SET perfil = 'admin'
WHERE email = @email_admin;

SELECT ROW_COUNT() AS contas_promovidas;
