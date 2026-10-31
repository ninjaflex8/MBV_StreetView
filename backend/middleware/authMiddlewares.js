
const jwt = require("jsonwebtoken");

function authMiddlewares(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Token de autenticação não informado."
        });
    }

    const token = authorization.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token de autenticação inválido."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET não está configurado.");

        return res.status(500).json({
            message: "Erro interno de autenticação."
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.usuario = {
            id: decoded.id,
            email: decoded.email
        };

        return next();
    } catch (err) {
        return res.status(401).json({
            message: "Token inválido ou expirado."
        });
    }
}

module.exports = authMiddlewares;
