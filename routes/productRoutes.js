const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

router.get("/", productController.index);
router.get("/products/:id", productController.detail);
router.get("/guide", productController.guide);
router.post("/checkout", productController.checkout);

module.exports = router;
