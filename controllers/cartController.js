const productModel = require("../models/productModel");

function ownerId(req) {
  return req.session.user ? `customer:${req.session.user.id}` : "guest";
}

function requireCartAccess(req, res, next) {
  if (req.session.user && req.session.user.role !== "customer") {
    res.status(403).json({ error: "Tài khoản quản trị không sử dụng giỏ hàng." });
    return;
  }
  next();
}

function sessionCart(req) {
  const currentOwner = ownerId(req);
  if (!req.session.cart || req.session.cart.ownerId !== currentOwner) {
    req.session.cart = { ownerId: currentOwner, items: [] };
  }
  return req.session.cart;
}

async function presentItems(items) {
  const productRows = await Promise.all(items.map((item) => productModel.findById(item.id)));
  return items.flatMap((item, index) => {
    const product = productRows[index];
    if (!product) return [];
    return [{
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      quantity: item.quantity,
      stock: product.stock
    }];
  });
}

async function getCart(req, res, next) {
  try {
    const cart = sessionCart(req);
    cart.items = cart.items.filter((item) =>
      Number.isSafeInteger(item.id) && item.id > 0
      && Number.isSafeInteger(item.quantity) && item.quantity > 0
    );
    const products = await presentItems(cart.items);
    const availableProducts = products.filter((item) => item.stock > 0);
    cart.items = availableProducts.map(({ id, quantity }) => ({ id, quantity }));
    res.json({ items: availableProducts });
  } catch (error) {
    next(error);
  }
}

async function replaceCart(req, res, next) {
  const items = req.body && req.body.items;
  if (!Array.isArray(items) || items.length > 50) {
    res.status(400).json({ error: "Danh sách sản phẩm trong giỏ hàng không hợp lệ." });
    return;
  }

  const quantities = new Map();
  for (const item of items) {
    if (
      !item || !Number.isSafeInteger(Number(item.id)) || Number(item.id) < 1
      || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1
      || Number(item.quantity) > 99
    ) {
      res.status(400).json({ error: "Sản phẩm hoặc số lượng trong giỏ hàng không hợp lệ." });
      return;
    }
    const id = Number(item.id);
    const quantity = (quantities.get(id) || 0) + Number(item.quantity);
    if (quantity > 99) {
      res.status(400).json({ error: "Mỗi sản phẩm chỉ được thêm tối đa 99 gói." });
      return;
    }
    quantities.set(id, quantity);
  }

  try {
    const canonicalItems = [...quantities].map(([id, quantity]) => ({ id, quantity }));
    const products = await presentItems(canonicalItems);
    if (products.length !== canonicalItems.length) {
      res.status(400).json({ error: "Một sản phẩm trong giỏ không còn tồn tại." });
      return;
    }
    const unavailable = products.find((product) => product.quantity > product.stock);
    if (unavailable) {
      res.status(409).json({ error: `Sản phẩm “${unavailable.name}” không đủ số lượng trong kho.` });
      return;
    }

    const cart = sessionCart(req);
    cart.items = canonicalItems;
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
}

module.exports = { requireCartAccess, getCart, replaceCart };
