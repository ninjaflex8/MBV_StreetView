const express = require("express");
const authMiddleware = require("../middleware/authMiddlewares");
const autorizarPerfil = require("../middleware/autorizarPerfil");
const commerceController = require("../controllers/commerceController");

const router = express.Router();

router.use(authMiddleware, autorizarPerfil("admin"));

router.get("/teste", (_req, res) => {
    return res.status(200).json({ message: "Acesso administrativo autorizado." });
});
router.get("/dashboard", commerceController.dashboard);
router.get("/categorias", commerceController.listarCategorias);
router.post("/categorias", commerceController.criarCategoria);
router.put("/categorias/:id", commerceController.atualizarCategoria);
router.delete("/categorias/:id", commerceController.excluirCategoria);
router.get("/produtos", commerceController.listarProdutos);
router.post("/produtos", commerceController.criarProduto);
router.put("/produtos/:id", commerceController.atualizarProduto);
router.delete("/produtos/:id", commerceController.excluirProduto);
router.post("/produtos/:id/variacoes", commerceController.criarVariacao);
router.put("/variacoes/:id", commerceController.atualizarVariacao);
router.delete("/variacoes/:id", commerceController.excluirVariacao);
router.patch("/variacoes/:id/estoque", commerceController.ajustarEstoque);
router.get("/movimentacoes", commerceController.listarMovimentacoes);
router.get("/pedidos", commerceController.listarPedidos);
router.post("/pedidos/:id/confirmar", commerceController.confirmarPedido);

module.exports = router;
