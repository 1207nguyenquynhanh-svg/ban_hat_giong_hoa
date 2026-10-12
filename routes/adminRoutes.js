const express = require("express");
const adminController = require("../controllers/adminController");
const { uploadProductImage } = require("./productImageUpload");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
    return;
  }
  if (req.session.user.role !== "admin") {
    res.status(403).render("error", { pageTitle: "Không đủ quyền truy cập" });
    return;
  }
  next();
}

router.use(requireAdmin);
router.get("/dashboard", adminController.dashboard);
router.post("/products", uploadProductImage, (req, res, next) => {
  adminController.createProduct(req, res, next);
});
router.post("/products/:id/update", adminController.updateProduct);
router.post("/products/:id/delete", adminController.deleteProduct);

module.exports = router;
