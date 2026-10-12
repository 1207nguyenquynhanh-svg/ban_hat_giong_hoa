const express = require("express");
const cartController = require("../controllers/cartController");
const requireCustomer = require("../middleware/requireCustomer");

const router = express.Router();

router.use(requireCustomer);
router.use(cartController.requireCartAccess);
router.get("/", cartController.getCart);
router.put("/", cartController.replaceCart);

module.exports = router;
