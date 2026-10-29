
const db = require("../database/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.register = async (req, res) => {
 try {
  const { nome, email, senha } = req.body || {};

  // Validar os campos
  if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string"
  ) {
   return res.status(400).json({
    message: "Informe nome, e-mail e senha."
   });
  }

  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();

  if (!nomeLimpo || nomeLimpo.length > 30) {
   return res.status(400).json({
    message: "O nome deve ter entre 1 e 30 caracteres."
   });
  }

  if (
      !emailLimpo ||
      emailLimpo.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
  ) {
   return res.status(400).json({
    message: "Informe um e-mail válido, com até 100 caracteres."
   });
  }

  if (!senha || senha.length > 50) {
   return res.status(400).json({
    message: "A senha deve ter entre 1 e 50 caracteres."
   });
  }

  // Gerar o hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  const sql = `
   INSERT INTO usuarios (nome, email, senha)
   VALUES (?, ?, ?)
  `;

  db.query(
      sql,
      [nomeLimpo, emailLimpo, senhaHash],
      (err, result) => {
       if (err) {
        if (err.code === "ER_DUP_ENTRY") {
         return res.status(409).json({
          message: "Este e-mail já está cadastrado."
         });
        }

        console.error("Erro ao cadastrar usuário:", err.code);

        return res.status(500).json({
         message: "Não foi possível realizar o cadastro."
        });
       }

       return res.status(201).json({
        message: "Usuário cadastrado com sucesso.",
        usuario: {
         id: result.insertId,
         nome: nomeLimpo,
         email: emailLimpo
        }
       });
      }
  );
 } catch (err) {
  console.error("Erro no cadastro:", err.message);

  return res.status(500).json({
   message: "Erro interno ao realizar o cadastro."
  });
 }
};

exports.login = (req, res) => {
 const { email, senha } = req.body || {};

 // Validar os campos recebidos
 if (
     typeof email !== "string" ||
     typeof senha !== "string" ||
     !email.trim() ||
     !senha
 ) {
  return res.status(400).json({
   message: "Informe e-mail e senha."
  });
 }

 const emailLimpo = email.trim().toLowerCase();

 const sql = `
    SELECT id, nome, email, senha
    FROM usuarios
    WHERE email = ?
  `;

 db.query(sql, [emailLimpo], async (err, result) => {
  if (err) {
   console.error("Erro ao consultar usuário:", err.code);

   return res.status(500).json({
    message: "Não foi possível realizar o login."
   });
  }

  // Verificar se o usuário existe
  if (result.length === 0) {
   return res.status(401).json({
    message: "Usuário ou senha incorretos."
   });
  }

  try {
   const usuario = result[0];

   // Conferir a senha com o hash armazenado
   const senhaCorreta = await bcrypt.compare(
       senha,
       usuario.senha
   );

   if (!senhaCorreta) {
    return res.status(401).json({
     message: "Usuário ou senha incorretos."
    });
   }

   // Verificar se o segredo JWT está configurado
   if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não está configurado.");

    return res.status(500).json({
     message: "Erro interno ao realizar o login."
    });
   }

   // Gerar token após validar a senha
   const token = jwt.sign(
       {
        id: usuario.id,
        email: usuario.email
       },
       process.env.JWT_SECRET,
       { expiresIn: "2h" }
   );

   return res.status(200).json({
    message: "Login realizado com sucesso.",
    token,
    usuario: {
     id: usuario.id,
     nome: usuario.nome,
     email: usuario.email
    }
   });
  } catch (err) {
   console.error("Erro ao processar login:", err.message);

   return res.status(500).json({
    message: "Erro interno ao realizar o login."
   });
  }
 });
};
