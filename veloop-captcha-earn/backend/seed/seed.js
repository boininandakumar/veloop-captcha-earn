require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const User = require("../src/models/User");
const Wallet = require("../src/models/Wallet");
const CaptchaRewardConfig = require("../src/models/CaptchaRewardConfig");

async function run() {
  await connectDB();

  const email = "demo@veloop.test";
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await User.hashPassword("Demo@12345");
    user = await User.create({ email, passwordHash, name: "Demo User" });
    console.log(`[seed] created demo user ${email} / Demo@12345`);
  } else {
    console.log(`[seed] demo user already exists: ${email}`);
  }

  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balanceMilliGems: 100000 }); // 100 Gems
    console.log("[seed] created wallet with 100 Gems");
  } else {
    console.log(`[seed] wallet already exists, balance = ${wallet.toGems()} Gems`);
  }

  const existingConfig = await CaptchaRewardConfig.findOne({ key: "default" });
  if (!existingConfig) {
    await CaptchaRewardConfig.create({
      key: "default",
      correctRewardMilliGems: 1000,
      wrongRewardMilliGems: 500,
      currency: "GEMS",
      challengeExpirySeconds: Number(process.env.CAPTCHA_EXPIRY_SECONDS || 120),
      active: true,
    });
    console.log("[seed] created default CaptchaRewardConfig (correct=1, wrong=0.5)");
  } else {
    console.log("[seed] reward config already exists");
  }

  console.log("[seed] done.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
