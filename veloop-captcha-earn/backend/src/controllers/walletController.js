const walletService = require("../services/wallet.service");
const captchaService = require("../services/captcha.service");

// GET /api/wallet/gems
async function getGems(req, res) {
  const balance = await walletService.getBalance(req.userId);
  res.json({ success: true, currency: "GEMS", balance });
}

// GET /api/captcha/history
async function getHistory(req, res) {
  const history = await captchaService.getHistory(req.userId);
  res.json({ success: true, history });
}

module.exports = { getGems, getHistory };
