const productModel = require("../models/productModel");
const orderModel = require("../models/orderModel");

function getFilters(query) {
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 80) : "";
  const category = productModel.categories.includes(query.category) ? query.category : "";
  const difficulty = productModel.difficulties.includes(query.difficulty) ? query.difficulty : "";
  const minPrice = productModel.readPrice(query.minPrice);
  const maxPrice = productModel.readPrice(query.maxPrice);

  return {
    search,
    category,
    difficulty,
    minPrice,
    maxPrice,
    displayMinPrice: typeof query.minPrice === "string" ? query.minPrice : "",
    displayMaxPrice: typeof query.maxPrice === "string" ? query.maxPrice : ""
  };
}

async function index(req, res, next) {
  const filters = getFilters(req.query);
  try {
    const products = await productModel.findAll(filters);
    res.render("index", {
      pageTitle: "Hạt giống hoa",
      products,
      categories: productModel.categories,
      filters: {
        search: filters.search,
        category: filters.category,
        difficulty: filters.difficulty,
        minPrice: filters.displayMinPrice,
        maxPrice: filters.displayMaxPrice
      }
    });
  } catch (error) {
    next(error);
  }
}

async function detail(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    res.status(404).render("404", { pageTitle: "Không tìm thấy sản phẩm" });
    return;
  }

  try {
    const product = await productModel.findById(id);
    if (!product) {
      res.status(404).render("404", { pageTitle: "Không tìm thấy sản phẩm" });
      return;
    }
    res.render("product-detail", { pageTitle: product.name, product });
  } catch (error) {
    next(error);
  }
}

function guide(req, res) {
  res.render("guide", { pageTitle: "Hướng dẫn gieo trồng" });
}

async function checkout(req, res, next) {
  const { customerName, phone, address, items } = req.body || {};
  if (
    typeof customerName !== "string" || customerName.trim().length < 2 || customerName.trim().length > 100
    || typeof phone !== "string" || !/^[0-9+().\-\s]{8,20}$/.test(phone.trim())
    || typeof address !== "string" || address.trim().length < 8 || address.trim().length > 300
    || !Array.isArray(items) || items.length < 1 || items.length > 50
  ) {
    res.status(400).json({ error: "Vui lòng kiểm tra họ tên, số điện thoại, địa chỉ và giỏ hàng." });
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
    quantities.set(id, (quantities.get(id) || 0) + Number(item.quantity));
  }
  if ([...quantities.values()].some((quantity) => quantity > 99)) {
    res.status(400).json({ error: "Mỗi sản phẩm chỉ được đặt tối đa 99 hạt giống." });
    return;
  }

  try {
    const order = await orderModel.createOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      items: [...quantities].map(([id, quantity]) => ({ id, quantity }))
    });
    res.status(201).json(order);
  } catch (error) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
}

module.exports = { index, detail, guide, checkout };
