const { db } = require("../config/db");

const categories = [
  "Hoa ban công",
  "Hoa kiểng cắt cành",
  "Hoa hồng ngoại",
  "Hạt giống dễ trồng"
];
const difficulties = ["Dễ", "Trung bình", "Khó"];

function readPrice(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const price = Number(value);
  return Number.isSafeInteger(price) && price >= 0 && price <= 100000000 ? price : null;
}

async function findAll(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.search) {
    conditions.push("name LIKE ? ESCAPE '\\'");
    values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
  }
  if (filters.category) {
    conditions.push("category = ?");
    values.push(filters.category);
  }
  if (filters.difficulty) {
    conditions.push("difficulty = ?");
    values.push(filters.difficulty);
  }
  if (filters.minPrice !== null) {
    conditions.push("price >= ?");
    values.push(filters.minPrice);
  }
  if (filters.maxPrice !== null) {
    conditions.push("price <= ?");
    values.push(filters.maxPrice);
  }

  const sql = `SELECT * FROM products${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY id`;
  return db.allAsync(sql, values);
}

function findById(id) {
  return db.getAsync("SELECT * FROM products WHERE id = ?", [id]);
}

module.exports = {
  categories,
  difficulties,
  findAll,
  findById,
  readPrice
};
