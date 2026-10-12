const crypto = require("crypto");
const { db } = require("../config/db");
const productModel = require("./productModel");

// SQLite dùng chung một kết nối; xếp hàng giao dịch để không đan xen BEGIN/COMMIT.
let orderQueue = Promise.resolve();

function createOrder({ customerName, phone, address, items }) {
  const operation = orderQueue.then(
    () => saveOrder({ customerName, phone, address, items })
  );
  orderQueue = operation.catch(() => {});
  return operation;
}

function makeOrderCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FS-${date}-${suffix}`;
}

async function saveOrder({ customerName, phone, address, items }) {
  let transactionStarted = false;
  try {
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    transactionStarted = true;

    const verifiedItems = [];
    let totalPrice = 0;
    for (const item of items) {
      const product = await productModel.findById(item.id);
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

      const subtotal = product.price * item.quantity;
      totalPrice += subtotal;
      verifiedItems.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        subtotal
      });
    }

    const orderCode = makeOrderCode();
    const result = await db.runAsync(
      `INSERT INTO orders
        (order_code, customer_name, phone, address, items_json, total_price, status, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderCode,
        customerName,
        phone,
        address,
        JSON.stringify(verifiedItems),
        totalPrice,
        "pending",
        totalPrice
      ]
    );

    // Duy trì bảng chi tiết cũ để các đơn hàng trước đây vẫn cùng cấu trúc truy vấn.
    for (const item of verifiedItems) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [result.lastID, item.productId, item.name, item.unitPrice, item.quantity]
      );
      await db.runAsync(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.productId]
      );
    }

    await db.runAsync("COMMIT");
    transactionStarted = false;
    return { orderCode, totalPrice };
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

module.exports = { createOrder };
