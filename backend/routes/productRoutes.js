const express = require("express");
const commerceController = require("../controllers/commerceController");

const router = express.Router();

router.get("/", commerceController.listarProdutos);
router.get("/categorias", commerceController.listarCategoriasPublicas);

module.exports = router;
