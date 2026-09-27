const rateLimit = require("express-rate-limit");

// Applied per-route (see routes/captchaRoutes.js) to
// /captcha/current, /captcha/new, /captcha/verify, /captcha/claim
// per spec section 48. Keyed by authenticated userId when available so
// one abusive account can't hide behind a shared IP / vice versa.
const captchaRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many requests. Please slow down.",
    });
  },
});

module.exports = captchaRateLimiter;
