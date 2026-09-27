const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    // Stored as integer "milli-gems" (gem * 1000) to avoid floating point
    // drift when crediting fractional rewards like 0.5. All reads are
    // converted back to a decimal gem value at the API boundary.
    balanceMilliGems: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

walletSchema.methods.toGems = function () {
  return this.balanceMilliGems / 1000;
};

module.exports = mongoose.model("Wallet", walletSchema);
