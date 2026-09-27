const jwt = require("jsonwebtoken");

/**
 * Requires a valid JWT. Attaches req.userId derived ONLY from the token
 * signature - never from any client-supplied userId field/param. This is
 * what enforces "user isolation" (spec section 47): a request for another
 * user's challenge/history is rejected here or in the service layer, never
 * decided by trusting req.body.userId.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, code: "NO_TOKEN", message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, code: "INVALID_TOKEN", message: "Invalid or expired token." });
  }
}

module.exports = requireAuth;
