const express = require("express");
const requireAuth = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  getCurrent,
  forceNew,
  verify,
  claim,
  noThanks,
  getPublicConfig,
} = require("../controllers/captchaController");
const { getHistory } = require("../controllers/walletController");

const router = express.Router();

router.get("/current", requireAuth, rateLimiter, getCurrent);
router.post("/new", requireAuth, rateLimiter, forceNew);
router.post("/verify", requireAuth, rateLimiter, verify);
router.post("/claim", requireAuth, rateLimiter, claim);
router.post("/no-thanks", requireAuth, rateLimiter, noThanks);
router.get("/history", requireAuth, getHistory);
router.get("/config", getPublicConfig);

module.exports = router;
