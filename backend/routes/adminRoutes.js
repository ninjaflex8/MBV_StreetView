const express = require("express");
const authMiddleware = require("../middleware/authMiddlewares");
const autorizarPerfil = require("../middleware/autorizarPerfil");

const router = express.Router();

router.get(
    "/teste",
    authMiddleware,
    autorizarPerfil("admin"),
    (_req, res) => {
        return res.status(200).json({
            message: "Acesso administrativo autorizado."
        });
    }
);

module.exports = router;
