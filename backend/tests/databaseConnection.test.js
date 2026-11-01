const assert = require("node:assert/strict");
const test = require("node:test");

const db = require("../database/connection");

test("database export supports pooled promise connections for transactions", () => {
  assert.equal(typeof db.promise().getConnection, "function");
});
