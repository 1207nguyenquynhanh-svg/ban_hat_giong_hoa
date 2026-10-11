const { db } = require("../config/db");

function findByUsername(username) {
  return db.getAsync(
    "SELECT id, username, password_hash, salt, role FROM users WHERE username = ?",
    [username]
  );
}

module.exports = { findByUsername };
