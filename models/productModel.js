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
  if (filters.minPrice !== null && filters.minPrice !== undefined) {
    conditions.push("price >= ?");
    values.push(filters.minPrice);
  }
  if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
    conditions.push("price <= ?");
    values.push(filters.maxPrice);
  }

  const sql = `SELECT * FROM products${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY id`;
  return db.allAsync(sql, values);
}

function findById(id) {
  return db.getAsync("SELECT * FROM products WHERE id = ?", [id]);
}

function create(product) {
  return db.runAsync(
    `INSERT INTO products
      (name, description, price, image_url, category, germination_days, difficulty, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.name,
      product.description,
      product.price,
      product.image_url,
      product.category,
      product.germination_days,
      product.difficulty,
      product.stock
    ]
  );
}

async function updatePriceAndStock(id, { price, stock }) {
  const result = await db.runAsync(
    "UPDATE products SET price = ?, stock = ? WHERE id = ?",
    [price, stock, id]
  );
  return result.changes > 0;
}

async function remove(id) {
  let transactionStarted = false;
  try {
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    transactionStarted = true;
    const product = await findById(id);
    if (!product) {
      await db.runAsync("ROLLBACK");
      transactionStarted = false;
      return false;
    }

    // Lịch sử đơn hàng vẫn còn nguyên trong items_json dưới dạng ảnh chụp sản phẩm.
    await db.runAsync("DELETE FROM order_items WHERE product_id = ?", [id]);
    await db.runAsync("DELETE FROM products WHERE id = ?", [id]);
    await db.runAsync("COMMIT");
    transactionStarted = false;
    return true;
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.runAsync("ROLLBACK");
      } catch (rollbackError) {
        console.error("Không thể hoàn tác thao tác xóa sản phẩm:", rollbackError);
      }
    }
    throw error;
  }
}

module.exports = {
  categories,
  difficulties,
  findAll,
  findById,
  readPrice,
  create,
  updatePriceAndStock,
  remove
};
