const fs = require("fs");
const orderModel = require("../models/orderModel");
const productModel = require("../models/productModel");

const notices = {
  created: "Đã thêm sản phẩm mới.",
  updated: "Đã cập nhật giá và số lượng sản phẩm.",
  deleted: "Đã xóa sản phẩm."
};

const productFormFields = [
  "name",
  "category",
  "description",
  "image_url",
  "price",
  "stock",
  "germination_days",
  "difficulty"
];

function isValidProductId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function validateNewProduct(body, uploadedFile) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const germinationDays = typeof body.germination_days === "string"
    ? body.germination_days.trim()
    : "";
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "";
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (
    name.length < 2 || name.length > 120
    || description.length < 5 || description.length > 500
    || !Number.isSafeInteger(price) || price < 0 || price > 100000000
    || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000
    || (!uploadedFile && !isHttpsImageUrl(imageUrl))
    || (uploadedFile && imageUrl !== "")
    || imageUrl.length > 1000
    || !productModel.categories.includes(category)
    || germinationDays.length < 1 || germinationDays.length > 60
    || !productModel.difficulties.includes(difficulty)
  ) {
    return null;
  }

  if (uploadedFile && !await hasValidImageSignature(uploadedFile.path, uploadedFile.mimetype)) {
    return null;
  }

  return {
    name,
    description,
    price,
    stock,
    image_url: uploadedFile ? `/uploads/${uploadedFile.filename}` : imageUrl,
    category,
    germination_days: germinationDays,
    difficulty
  };
}

function isHttpsImageUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

async function hasValidImageSignature(filePath, mimeType) {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (mimeType === "image/png") {
      return bytesRead === 8 && header.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    return mimeType === "image/jpeg"
      && bytesRead >= 3
      && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  } finally {
    await handle.close();
  }
}

async function removeUploadedFile(file) {
  if (!file) return;
  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Không thể xóa ảnh tải lên không được sử dụng:", error);
    }
  }
}

function validatePriceAndStock(body) {
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (
    !Number.isSafeInteger(price) || price < 0 || price > 100000000
    || !Number.isSafeInteger(stock) || stock < 0 || stock > 1000000
  ) {
    return null;
  }
  return { price, stock };
}

async function dashboard(req, res, next) {
  try {
    await renderDashboard(res, {
      notice: notices[req.query.notice] || null,
      formValues: emptyProductForm()
    });
  } catch (error) {
    next(error);
  }
}

async function renderDashboard(res, { modal = null, formValues = emptyProductForm(), status = 200, notice = null } = {}) {
  const [{ summary, orders }, products] = await Promise.all([
    orderModel.getDashboardSummary(),
    productModel.findAll()
  ]);
  res.status(status).render("admin/dashboard", {
    pageTitle: "Quản trị FloraSeed",
    summary,
    orders: orders.map((order) => ({
      ...order,
      items: parseOrderItems(order.items_json)
    })),
    products,
    categories: productModel.categories,
    difficulties: productModel.difficulties,
    notice,
    modal,
    formValues
  });
}

function emptyProductForm() {
  return {
    name: "",
    category: productModel.categories[0],
    description: "",
    image_url: "",
    price: "",
    stock: "50",
    germination_days: "",
    difficulty: productModel.difficulties[0]
  };
}

function submittedProductForm(body = {}) {
  return Object.fromEntries(productFormFields.map((field) => [
    field,
    typeof body[field] === "string" ? body[field].slice(0, 1000) : ""
  ]));
}

async function createProduct(req, res, next) {
  try {
    if (req.productUploadError) {
      const uploadError = req.productUploadError;
      await renderDashboard(res, {
        status: uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400,
        modal: {
          title: "Ảnh chưa thể tải lên",
          message: uploadError.code === "LIMIT_FILE_SIZE"
            ? "Dung lượng ảnh vượt quá 5 MB. Hãy chọn ảnh nhỏ hơn."
            : uploadError.message || "Chỉ hỗ trợ ảnh PNG hoặc JPG hợp lệ."
        },
        formValues: submittedProductForm(req.body)
      });
      return;
    }

    const product = await validateNewProduct(req.body || {}, req.file);
    if (!product) {
      await removeUploadedFile(req.file);
      const hasImageSource = Boolean(req.file)
        || (typeof req.body?.image_url === "string" && req.body.image_url.trim() !== "");
      await renderDashboard(res, {
        status: 400,
        modal: {
          title: hasImageSource ? "Thông tin chưa hợp lệ" : "Thiếu ảnh sản phẩm",
          message: hasImageSource
            ? "Kiểm tra lại các trường bắt buộc và chọn ảnh PNG/JPG hợp lệ hoặc nhập đúng URL HTTPS."
            : "Hãy tải ảnh PNG/JPG từ máy tính lên hoặc nhập URL ảnh bắt đầu bằng HTTPS."
        },
        formValues: submittedProductForm(req.body)
      });
      return;
    }
    await productModel.create(product);
    res.redirect("/admin/dashboard?notice=created");
  } catch (error) {
    await removeUploadedFile(req.file);
    console.error("Không thể thêm sản phẩm từ dashboard:", error);
    try {
      await renderDashboard(res, {
        status: 500,
        modal: {
          title: "Chưa thể thêm sản phẩm",
          message: "Đã xảy ra lỗi khi lưu sản phẩm. Vui lòng thử lại; dữ liệu biểu mẫu vẫn được giữ."
        },
        formValues: submittedProductForm(req.body)
      });
    } catch (renderError) {
      next(renderError);
    }
  }
}

async function updateProduct(req, res, next) {
  const id = isValidProductId(req.params.id);
  const priceAndStock = validatePriceAndStock(req.body || {});
  if (!id || !priceAndStock) {
    res.status(400).send("Mã sản phẩm, giá hoặc số lượng không hợp lệ.");
    return;
  }

  try {
    const updated = await productModel.updatePriceAndStock(id, priceAndStock);
    if (!updated) {
      res.status(404).send("Không tìm thấy sản phẩm cần cập nhật.");
      return;
    }
    res.redirect("/admin/dashboard?notice=updated");
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  const id = isValidProductId(req.params.id);
  if (!id) {
    res.status(400).send("Mã sản phẩm không hợp lệ.");
    return;
  }

  try {
    const deleted = await productModel.remove(id);
    if (!deleted) {
      res.status(404).send("Không tìm thấy sản phẩm cần xóa.");
      return;
    }
    res.redirect("/admin/dashboard?notice=deleted");
  } catch (error) {
    next(error);
  }
}

function parseOrderItems(itemsJson) {
  try {
    const items = JSON.parse(itemsJson);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error("Không đọc được danh sách sản phẩm của đơn hàng:", error);
    return [];
  }
}

module.exports = { dashboard, createProduct, updateProduct, deleteProduct };
