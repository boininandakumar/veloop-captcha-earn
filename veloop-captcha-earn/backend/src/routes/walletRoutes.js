const express = require("express");
const requireAuth = require("../middleware/auth");
const { getGems } = require("../controllers/walletController");

const router = express.Router();

router.get("/gems", requireAuth, getGems);

module.exports = router;
