const express = require("express");
const authMiddleware = require("../middleware/authMiddlewares");
const commerceController = require("../controllers/commerceController");

const router = express.Router();

router.use(authMiddleware);
router.get("/", commerceController.listarPedidos);
router.post("/", commerceController.criarPedido);

module.exports = router;
