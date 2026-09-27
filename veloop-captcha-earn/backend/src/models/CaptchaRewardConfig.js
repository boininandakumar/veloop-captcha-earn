const mongoose = require("mongoose");

const captchaRewardConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    correctRewardMilliGems: { type: Number, default: 1000 }, // 1 Gem
    wrongRewardMilliGems: { type: Number, default: 500 }, // 0.5 Gem
    currency: { type: String, default: "GEMS" },
    challengeExpirySeconds: { type: Number, default: 120 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CaptchaRewardConfig", captchaRewardConfigSchema);
