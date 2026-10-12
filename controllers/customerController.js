const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");

const orderStatuses = {
  pending: "Chờ xử lý (Pending)",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipped: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy"
};

const notices = {
  updated: "Đơn hàng đã được cập nhật.",
  cancelled: "Đơn hàng đã được hủy và số lượng được hoàn lại kho.",
  invalid: "Thông tin chỉnh sửa chưa hợp lệ. Hãy kiểm tra và thử lại.",
  notPending: "Đơn chỉ có thể chỉnh sửa hoặc hủy khi đang chờ xử lý.",
  unavailable: "Không đủ tồn kho cho số lượng bạn chọn; đơn hàng chưa thay đổi.",
  notFound: "Không tìm thấy đơn hàng cần cập nhật."
};

function parseOrderItems(itemsJson) {
  try {
    const items = JSON.parse(itemsJson);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error("Không thể đọc sản phẩm trong lịch sử đơn hàng:", error);
    return [];
  }
}

function formatOrderDate(value) {
  const date = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" });
}

async function orders(req, res, next) {
  try {
    const [customerOrders, products] = await Promise.all([
      orderModel.findByCustomerId(req.session.user.id),
      productModel.findAll()
    ]);
    res.render("customer/orders", {
      pageTitle: "Đơn hàng của tôi",
      products,
      notice: notices[req.query.notice] || null,
      orders: customerOrders.map((order) => ({
        ...order,
        items: parseOrderItems(order.items_json),
        itemQuantities: getItemQuantities(order.items_json),
        displayStatus: orderStatuses[order.status] || order.status,
        displayDate: formatOrderDate(order.created_at)
      }))
    });
  } catch (error) {
    next(error);
  }
}

function getItemQuantities(itemsJson) {
  const quantities = {};
  for (const item of parseOrderItems(itemsJson)) {
    const productId = Number(item.productId ?? item.product_id);
    const quantity = Number(item.quantity);
    if (Number.isSafeInteger(productId) && productId > 0
      && Number.isSafeInteger(quantity) && quantity > 0) {
      quantities[productId] = (quantities[productId] || 0) + quantity;
    }
  }
  return quantities;
}

function validOrderId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function readUpdatedItems(body) {
  const items = [];
  for (const [key, value] of Object.entries(body)) {
    if (!key.startsWith("quantity_")) continue;
    const id = Number(key.slice("quantity_".length));
    if (!Number.isSafeInteger(id) || id < 1 || typeof value !== "string" || !/^\d{1,2}$/.test(value)) {
      return null;
    }
    const quantity = Number(value);
    if (quantity > 99) return null;
    if (quantity > 0) items.push({ id, quantity });
  }
  return items.length > 0 && items.length <= 50 ? items : null;
}

function validateRecipient(body) {
  const customerName = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (
    customerName.length < 2 || customerName.length > 100
    || !/^[0-9]{10}$/.test(phone)
    || address.length < 8 || address.length > 300
  ) {
    return null;
  }
  return { customerName, phone, address };
}

function noticeForError(error) {
  if (error.status === 404) return "notFound";
  if (error.status === 409) {
    return /không đủ số lượng/i.test(error.message) ? "unavailable" : "notPending";
  }
  return "invalid";
}

async function updateOrder(req, res, next) {
  const orderId = validOrderId(req.params.id);
  const recipient = validateRecipient(req.body || {});
  const items = readUpdatedItems(req.body || {});
  if (!orderId || !recipient || !items) {
    res.redirect("/customer/orders?notice=invalid");
    return;
  }

  try {
    await orderModel.updatePendingOrder({
      userId: req.session.user.id,
      orderId,
      ...recipient,
      items
    });
    res.redirect("/customer/orders?notice=updated");
  } catch (error) {
    if (error.status) {
      res.redirect(`/customer/orders?notice=${noticeForError(error)}`);
      return;
    }
    next(error);
  }
}

async function cancelOrder(req, res, next) {
  const orderId = validOrderId(req.params.id);
  if (!orderId) {
    res.redirect("/customer/orders?notice=notFound");
    return;
  }

  try {
    await orderModel.cancelPendingOrder({ userId: req.session.user.id, orderId });
    res.redirect("/customer/orders?notice=cancelled");
  } catch (error) {
    if (error.status) {
      res.redirect(`/customer/orders?notice=${noticeForError(error)}`);
      return;
    }
    next(error);
  }
}

module.exports = { orders, updateOrder, cancelOrder };