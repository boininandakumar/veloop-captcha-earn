const jwt = require("jsonwebtoken");
const User = require("../models/User");
const walletService = require("../services/wallet.service");

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// POST /api/auth/register  (helper for local dev / evaluators - not part
// of the CAPTCHA spec itself, but needed so there's a real user + JWT flow)
async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "email and password are required." });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ success: false, code: "EMAIL_IN_USE", message: "An account with this email already exists." });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash, name });
  await walletService.getOrCreateWallet(user._id);

  const token = signToken(user._id);
  res.status(201).json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." });
  }

  const token = signToken(user._id);
  res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name } });
}

// GET /api/auth/me
async function me(req, res) {
  const user = await User.findById(req.userId).select("email name createdAt");
  res.json({ success: true, user });
}

module.exports = { register, login, me };
