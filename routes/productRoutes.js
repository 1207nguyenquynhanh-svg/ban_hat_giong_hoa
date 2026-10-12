const express = require("express");
const productController = require("../controllers/productController");
const requireCustomer = require("../middleware/requireCustomer");

const router = express.Router();

router.get("/", productController.index);
router.get("/products/:id", productController.detail);
router.get("/guide", productController.guide);
router.post("/checkout", requireCustomer, productController.checkout);

module.exports = router;
