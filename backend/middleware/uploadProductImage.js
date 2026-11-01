const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const multer = require("multer");

const imageDirectory = process.env.PRODUCT_IMAGES_DIR || path.join(__dirname, "..", "uploads");
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 5 * 1024 * 1024;
const parseImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1, fields: 12, parts: 13, fieldSize: 20 * 1024 },
  fileFilter(_req, file, callback) {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      callback(new Error("Formato de imagem não suportado. Envie JPG, PNG ou WebP."));
      return;
    }
    callback(null, true);
  }
}).single("imagem");

function detectarTipoImagem(buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return { mimeType: "image/jpeg", extension: "jpg" };

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return { mimeType: "image/png", extension: "png" };

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return { mimeType: "image/webp", extension: "webp" };

  return null;
}

function sendUploadError(res, error) {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "A imagem deve ter no máximo 5 MB." });
  }
  if (error instanceof multer.MulterError || error.message.startsWith("Formato de imagem")) {
    return res.status(400).json({ message: error.message });
  }
  console.error("Erro ao receber imagem do produto:", error.code || error.message);
  return res.status(500).json({ message: "Não foi possível processar a imagem do produto." });
}

async function uploadProductImage(req, res, next) {
  parseImage(req, res, async error => {
    if (error) {
      sendUploadError(res, error);
      return;
    }

    if (typeof req.body?.ativo === "string") {
      if (req.body.ativo === "true") req.body.ativo = true;
      if (req.body.ativo === "false") req.body.ativo = false;
    }
    if (typeof req.body?.controlaTamanho === "string") {
      if (req.body.controlaTamanho === "true") req.body.controlaTamanho = true;
      if (req.body.controlaTamanho === "false") req.body.controlaTamanho = false;
    }

    if (!req.file) {
      next();
      return;
    }

    const detectedType = detectarTipoImagem(req.file.buffer);
    if (!detectedType || detectedType.mimeType !== req.file.mimetype) {
      res.status(400).json({ message: "O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WebP válida." });
      return;
    }

    const filename = `${crypto.randomBytes(16).toString("hex")}.${detectedType.extension}`;
    const imagePath = path.join(imageDirectory, filename);
    try {
      await fs.mkdir(imageDirectory, { recursive: true });
      await fs.writeFile(imagePath, req.file.buffer, { flag: "wx" });
    } catch (writeError) {
      console.error("Erro ao salvar imagem do produto:", writeError.code || writeError.message);
      res.status(500).json({ message: "Não foi possível salvar a imagem do produto." });
      return;
    }

    req.body = req.body || {};
    req.body.imagemUrl = `/uploads/${filename}`;
    res.once("finish", () => {
      if (res.statusCode < 400) return;
      fs.unlink(imagePath).catch(unlinkError => {
        if (unlinkError.code !== "ENOENT") {
          console.error("Erro ao remover imagem não utilizada:", unlinkError.code || unlinkError.message);
        }
      });
    });
    next();
  });
}

uploadProductImage.detectarTipoImagem = detectarTipoImagem;

module.exports = uploadProductImage;
