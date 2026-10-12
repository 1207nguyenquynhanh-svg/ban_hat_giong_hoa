const crypto = require("crypto");
const { db } = require("../config/db");
const productModel = require("./productModel");

// SQLite dùng chung một kết nối; xếp hàng giao dịch để không đan xen BEGIN/COMMIT.
let orderQueue = Promise.resolve();

function createOrder({ userId, customerName, phone, address, items }) {
  return enqueueOrderOperation(
    () => saveOrder({ userId, customerName, phone, address, items })
  );
}

function updatePendingOrder({ userId, orderId, customerName, phone, address, items }) {
  return enqueueOrderOperation(
    () => savePendingOrder({ userId, orderId, customerName, phone, address, items })
  );
}

function cancelPendingOrder({ userId, orderId }) {
  return enqueueOrderOperation(() => cancelPendingOrderTransaction({ userId, orderId }));
}

function enqueueOrderOperation(operation) {
  const result = orderQueue.then(operation);
  orderQueue = result.catch(() => {});
  return result;
}

async function getDashboardSummary() {
  const summary = await db.getAsync(`
    SELECT COUNT(*) AS orderCount,
           COALESCE(SUM(
             CASE WHEN status != 'cancelled'
               THEN CASE WHEN total_price > 0 THEN total_price ELSE total END
               ELSE 0
             END
           ), 0) AS revenue
    FROM orders
  `);
  const orders = await db.allAsync(`
    SELECT id, user_id, order_code, customer_name, phone, address,
           items_json, COALESCE(NULLIF(total_price, 0), total) AS total_price,
           status, created_at
    FROM orders
    ORDER BY id DESC
  `);

  return { summary, orders };
}

async function findByCustomerId(userId) {
  return db.allAsync(`
    SELECT id, order_code, customer_name, phone, address, items_json,
           COALESCE(NULLIF(total_price, 0), total) AS total_price,
           status, created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
  `, [userId]);
}

function makeOrderCode() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `FS-${date}-${suffix}`;
}

async function saveOrder({ userId, customerName, phone, address, items }) {
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
        (user_id, order_code, customer_name, phone, address, items_json, total_price, status, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
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
    return {
      orderCode,
      order_code: orderCode,
      totalPrice,
      total_price: totalPrice
    };
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

async function findOwnedPendingOrder(userId, orderId) {
  const order = await db.getAsync(
    `SELECT id, user_id, status, items_json FROM orders
     WHERE id = ? AND user_id = ?`,
    [orderId, userId]
  );
  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng của bạn.");
    error.status = 404;
    throw error;
  }
  if (order.status !== "pending") {
    const error = new Error("Chỉ có thể chỉnh sửa hoặc hủy đơn đang chờ xử lý.");
    error.status = 409;
    throw error;
  }
  return order;
}

async function getOrderItemQuantities(order) {
  try {
    const parsed = JSON.parse(order.items_json || "[]");
    if (Array.isArray(parsed)) {
      const quantities = new Map();
      for (const item of parsed) {
        const productId = Number(item.productId ?? item.product_id);
        const quantity = Number(item.quantity);
        if (Number.isSafeInteger(productId) && productId > 0
          && Number.isSafeInteger(quantity) && quantity > 0) {
          quantities.set(productId, (quantities.get(productId) || 0) + quantity);
        }
      }
      if (quantities.size) return quantities;
    }
  } catch (error) {
    console.warn("Đọc items_json thất bại, dùng bảng order_items:", error.message);
  }

  const rows = await db.allAsync(
    "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
    [order.id]
  );
  return new Map(rows.map((item) => [item.product_id, item.quantity]));
}

async function savePendingOrder({ userId, orderId, customerName, phone, address, items }) {
  let transactionStarted = false;
  try {
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    transactionStarted = true;
    const order = await findOwnedPendingOrder(userId, orderId);
    const previousQuantities = await getOrderItemQuantities(order);
    const requestedQuantities = new Map(items.map((item) => [item.id, item.quantity]));
    const allProductIds = new Set([...previousQuantities.keys(), ...requestedQuantities.keys()]);
    const productRows = new Map();
    for (const productId of allProductIds) {
      const product = await productModel.findById(productId);
      if (!product) {
        const error = new Error("Một sản phẩm của đơn hàng không còn tồn tại.");
        error.status = 409;
        throw error;
      }
      const availableAfterRelease = product.stock + (previousQuantities.get(productId) || 0);
      const requested = requestedQuantities.get(productId) || 0;
      if (requested > availableAfterRelease) {
        const error = new Error(`Sản phẩm “${product.name}” không đủ số lượng trong kho.`);
        error.status = 409;
        throw error;
      }
      productRows.set(productId, product);
    }

    const verifiedItems = [];
    let totalPrice = 0;
    for (const [productId, quantity] of requestedQuantities) {
      const product = productRows.get(productId);
      const subtotal = product.price * quantity;
      totalPrice += subtotal;
      verifiedItems.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity,
        subtotal
      });
    }

    for (const productId of allProductIds) {
      const stockChange = (previousQuantities.get(productId) || 0)
        - (requestedQuantities.get(productId) || 0);
      if (stockChange !== 0) {
        await db.runAsync(
          "UPDATE products SET stock = stock + ? WHERE id = ?",
          [stockChange, productId]
        );
      }
    }

    await db.runAsync(
      `UPDATE orders
       SET customer_name = ?, phone = ?, address = ?, items_json = ?, total_price = ?, total = ?
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [
        customerName,
        phone,
        address,
        JSON.stringify(verifiedItems),
        totalPrice,
        totalPrice,
        orderId,
        userId
      ]
    );
    await db.runAsync("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    for (const item of verifiedItems) {
      await db.runAsync(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.name, item.unitPrice, item.quantity]
      );
    }
    await db.runAsync("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.runAsync("ROLLBACK");
      } catch (rollbackError) {
        console.error("Không thể hoàn tác chỉnh sửa đơn hàng:", rollbackError);
      }
    }
    throw error;
  }
}

async function cancelPendingOrderTransaction({ userId, orderId }) {
  let transactionStarted = false;
  try {
    await db.runAsync("BEGIN IMMEDIATE TRANSACTION");
    transactionStarted = true;
    const order = await findOwnedPendingOrder(userId, orderId);
    const quantities = await getOrderItemQuantities(order);

    for (const [productId, quantity] of quantities) {
      const result = await db.runAsync(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [quantity, productId]
      );
      if (result.changes === 0) {
        const error = new Error("Không thể hoàn kho cho sản phẩm trong đơn hàng.");
        error.status = 409;
        throw error;
      }
    }

    const result = await db.runAsync(
      "UPDATE orders SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'",
      [orderId, userId]
    );
    if (result.changes !== 1) {
      const error = new Error("Đơn hàng đã được cập nhật. Hãy tải lại trang.");
      error.status = 409;
      throw error;
    }
    await db.runAsync("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.runAsync("ROLLBACK");
      } catch (rollbackError) {
        console.error("Không thể hoàn tác thao tác hủy đơn:", rollbackError);
      }
    }
    throw error;
  }
}

module.exports = {
  createOrder,
  getDashboardSummary,
  findByCustomerId,
  updatePendingOrder,
  cancelPendingOrder
};
