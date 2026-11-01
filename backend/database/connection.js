require("dotenv").config();
const mysql = require("mysql2");

const connectionPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "MBV_Shop",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = connectionPool;
