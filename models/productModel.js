const { db } = require("../config/db");

const categories = [
  "Hoa ban công",
  "Hoa kiểng cắt cành",
  "Hoa hồng ngoại",
  "Hạt giống dễ trồng"
];
const difficulties = ["Dễ", "Trung bình", "Khó"];
let orderQueue = Promise.resolve();

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

function createOrder({ customerName, phone, address, items }) {
  const operation = orderQueue.then(() => saveOrder({ customerName, phone, address, items }));
  orderQueue = operation.catch(() => {});
  return operation;
}

async function saveOrder({ customerName, phone, address, items }) {
  let transactionStarted = false;
  try {
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    transactionStarted = true;
    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const product = await findById(item.id);
      if (!product) {
        const error = new Error("Một sản phẩm trong giỏ không còn tồn tại.");
        error.status = 400;
        throw error;
      }
      if (product.stock < item.quantity) {
        const error = new Error(`Sản phẩm “${product.name}” không đủ số lượng trong kho.`);
        error.status = 409;
        throw error;
      }
      total += product.price * item.quantity;
      orderItems.push({ ...product, quantity: item.quantity });
    }

    const order = await db.runAsync(
      "INSERT INTO orders (customer_name, phone, address, total) VALUES (?, ?, ?, ?)",
      [customerName, phone, address, total]
    );
    for (const item of orderItems) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [order.lastID, item.id, item.name, item.price, item.quantity]
      );
      await db.runAsync("UPDATE products SET stock = stock - ? WHERE id = ?", [item.quantity, item.id]);
    }
    await db.runAsync("COMMIT");
    transactionStarted = false;
    return { orderId: order.lastID, total };
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.runAsync("ROLLBACK");
      } catch (rollbackError) {
        console.error("Không thể hoàn tác giao dịch đặt hàng:", rollbackError);
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
  createOrder
};
