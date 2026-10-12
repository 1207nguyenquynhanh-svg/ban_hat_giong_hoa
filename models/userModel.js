const { db } = require("../config/db");

function findByUsername(username) {
  return db.getAsync(
    "SELECT id, username, password_hash, salt, role FROM users WHERE username = ?",
    [username]
  );
}

function createCustomer({ username, passwordHash, salt }) {
  return db.runAsync(
    "INSERT INTO users (username, password_hash, salt, role) VALUES (?, ?, ?, 'customer')",
    [username, passwordHash, salt]
  );
}

module.exports = { findByUsername, createCustomer };
