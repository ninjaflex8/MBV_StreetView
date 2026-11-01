require("dotenv").config();

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError("PORT deve ser um número entre 1 e 65535.");
}

module.exports = {
  PORT: port
};