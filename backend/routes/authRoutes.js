const express = require("express")
const router = express.Router()

const authController = require("../controllers/authController")
const ola = require("../controllers/ola")
const authMiddleware = require("../middleware/authMiddlewares");

router.post("/login", authController.login)
router.get("/teste", ola.register)

router.post("/register", authController.register)

router.get("/me", authMiddleware, (req, res) => {
    return res.status(200).json({
        message: "Autenticação válida.",
        usuario: req.usuario
    });
});

module.exports = router