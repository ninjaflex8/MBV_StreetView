function autorizarPerfil(...perfisPermitidos) {
    if (perfisPermitidos.length === 0) {
        throw new TypeError("Informe ao menos um perfil autorizado.");
    }

    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({
                message: "Autenticação obrigatória."
            });
        }

        if (!perfisPermitidos.includes(req.usuario.perfil)) {
            return res.status(403).json({
                message: "Você não tem permissão para acessar este recurso."
            });
        }

        return next();
    };
}

module.exports = autorizarPerfil;
