require("dotenv").config();
const express = require("express");
const path = require("node:path");
const cors = require("cors");
const db = require("../database/connection");
const authRoutes = require("../routes/authRoutes");
const adminRoutes = require("../routes/adminRoutes");
const productRoutes = require("../routes/productRoutes");
const orderRoutes = require("../routes/orderRoutes");
const { PORT } = require("./config/envs");
const productImagesDirectory = process.env.PRODUCT_IMAGES_DIR || path.join(__dirname, "..", "uploads");

const app = express();
app.disable("x-powered-by");
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
if (process.env.NODE_ENV !== "production") {
  for (const origin of ["http://localhost:63342", "http://127.0.0.1:63342"]) {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600
}));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(["/auth", "/admin", "/pedidos"], (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "20kb" }));
app.use("/uploads", express.static(productImagesDirectory, {
  fallthrough: false,
  immutable: true,
  maxAge: "1y",
  dotfiles: "deny",
  index: false
}));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/produtos", productRoutes);
app.use("/pedidos", orderRoutes);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const missingProductionSettings = process.env.NODE_ENV === "production"
    ? ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET", "CORS_ORIGINS"]
        .filter((name) => !process.env[name])
    : [];

if (
    process.env.NODE_ENV === "production" &&
    process.env.JWT_SECRET &&
    process.env.JWT_SECRET.length < 32
) {
  missingProductionSettings.push("JWT_SECRET (mínimo de 32 caracteres)");
}

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  missingProductionSettings.push("CORS_ORIGINS (ao menos uma origem)");
}

if (missingProductionSettings.length > 0) {
  console.error(
      `Configuração de produção incompleta: ${missingProductionSettings.join(", ")}.`
  );
  process.exitCode = 1;
} else {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Erro ao conectar ao MySQL:", err.message);
      db.end((closeError) => {
        if (closeError) console.error("Erro ao encerrar o pool MySQL:", closeError.message);
      });
      process.exitCode = 1;
      return;
    }

    connection.release();
    console.log("Conectado ao MySQL com sucesso!");
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  });
}
