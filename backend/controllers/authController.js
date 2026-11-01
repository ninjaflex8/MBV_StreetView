const db = require("../database/connection");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MAX_PASSWORD_LENGTH = 50;
const MAX_PASSWORD_BYTES = 72;

function senhaValida(senha) {
  return senha.length >= 6 &&
      senha.length <= MAX_PASSWORD_LENGTH &&
      Buffer.byteLength(senha, "utf8") <= MAX_PASSWORD_BYTES;
}

exports.register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body || {};

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

    if (nomeLimpo.length < 3 || nomeLimpo.length > 30) {
      return res.status(400).json({
        message: "O nome deve ter entre 3 e 30 caracteres."
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

    if (!senhaValida(senha)) {
      return res.status(400).json({
        message: "A senha deve ter entre 6 e 50 caracteres e até 72 bytes."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const [result] = await db.promise().query(
        `INSERT INTO usuarios (nome, email, senha, perfil)
         VALUES (?, ?, ?, 'cliente')`,
        [nomeLimpo, emailLimpo, senhaHash]
    );

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso.",
      usuario: {
        id: result.insertId,
        nome: nomeLimpo,
        email: emailLimpo,
        perfil: "cliente"
      }
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Este e-mail já está cadastrado."
      });
    }

    console.error("Erro ao cadastrar usuário:", err.code || err.message);
    return res.status(500).json({
      message: "Não foi possível realizar o cadastro."
    });
  }
};

exports.login = async (req, res) => {
  const { email, senha } = req.body || {};

  if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha ||
      senha.length > MAX_PASSWORD_LENGTH ||
      Buffer.byteLength(senha, "utf8") > MAX_PASSWORD_BYTES
  ) {
    return res.status(400).json({
      message: "Informe um e-mail e uma senha válidos."
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET não está configurado.");
    return res.status(500).json({
      message: "Erro interno ao realizar o login."
    });
  }

  try {
    const emailLimpo = email.trim().toLowerCase();
    const [usuarios] = await db.promise().query(
        `SELECT id, nome, email, senha, perfil
         FROM usuarios
         WHERE email = ?
         LIMIT 1`,
        [emailLimpo]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        message: "Usuário ou senha incorretos."
      });
    }

    const usuario = usuarios[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({
        message: "Usuário ou senha incorretos."
      });
    }

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: "2h", algorithm: "HS256" }
    );

    return res.status(200).json({
      message: "Login realizado com sucesso.",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      }
    });
  } catch (err) {
    console.error("Erro ao processar login:", err.code || err.message);
    return res.status(500).json({
      message: "Não foi possível realizar o login."
    });
  }
};
