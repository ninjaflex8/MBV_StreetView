const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const express = require("express");

const imageDirectory = path.join(os.tmpdir(), `mbv-image-upload-${process.pid}`);
process.env.PRODUCT_IMAGES_DIR = imageDirectory;

const uploadProductImage = require("../middleware/uploadProductImage");
const app = express();
app.post("/upload", uploadProductImage, (req, res) => {
  res.json({ imageUrl: req.body.imagemUrl || null, active: req.body.ativo });
});

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await fs.rm(imageDirectory, { recursive: true, force: true });
});

test("stores a valid uploaded image and converts the active field", async () => {
  const form = new FormData();
  form.append("ativo", "false");
  form.append("imagemUrl", "imagens/old.jpg");
  form.append("imagem", new Blob([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ], { type: "image/png" }), "product.png");

  const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.active, false);
  assert.match(result.imageUrl, /^\/uploads\/[a-f0-9]{32}\.png$/);
  const storedImage = await fs.readFile(path.join(imageDirectory, path.basename(result.imageUrl)));
  assert.deepEqual(storedImage, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
});

test("rejects a file whose content does not match its declared image type", async () => {
  const form = new FormData();
  form.append("imagem", new Blob(["not an image"], { type: "image/jpeg" }), "product.jpg");

  const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.message, /conteúdo do arquivo não corresponde/);
});

test("rejects images larger than 5 MB", async () => {
  const form = new FormData();
  form.append("imagem", new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: "image/jpeg" }), "large.jpg");

  const response = await fetch(`${baseUrl}/upload`, { method: "POST", body: form });
  const result = await response.json();

  assert.equal(response.status, 413);
  assert.match(result.message, /no máximo 5 MB/);
});
