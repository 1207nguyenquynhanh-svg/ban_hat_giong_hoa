const express = require("express");
const customerController = require("../controllers/customerController");
const requireCustomer = require("../middleware/requireCustomer");

const router = express.Router();

router.use(requireCustomer);
router.get("/orders", customerController.orders);
router.post("/orders/:id/update", customerController.updateOrder);
router.post("/orders/:id/cancel", customerController.cancelOrder);

module.exports = router;