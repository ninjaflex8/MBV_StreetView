
const jwt = require("jsonwebtoken");
const db = require("../database/connection");

async function authMiddlewares(req, res, next) {
    const authorization = req.headers.authorization || "";
    const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);

    if (!tokenMatch) {
        return res.status(401).json({
            message: "Token de autenticação não informado."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET não está configurado.");
        return res.status(500).json({
            message: "Erro interno de autenticação."
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });
    } catch (err) {
        return res.status(401).json({
            message: "Token inválido ou expirado."
        });
    }

    const userId = Number(decoded && decoded.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(401).json({
            message: "Token inválido ou expirado."
        });
    }

    try {
        const [usuarios] = await db.promise().query(
            `SELECT id, nome, email, perfil
             FROM usuarios
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                message: "Usuário associado ao token não existe."
            });
        }

        const usuario = usuarios[0];
        req.usuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            perfil: usuario.perfil
        };

        return next();
    } catch (err) {
        console.error("Erro ao consultar usuário autenticado:", err.code || err.message);
        return res.status(500).json({
            message: "Não foi possível validar a autenticação."
        });
    }
}

module.exports = authMiddlewares;
