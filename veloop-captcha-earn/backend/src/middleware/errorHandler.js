function notFound(req, res) {
  res.status(404).json({ success: false, code: "NOT_FOUND", message: "Route not found." });
}

// Centralized handler so controllers can just `throw` (express-async-errors
// forwards rejected promises here automatically).
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error("[error]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    code: err.code || "INTERNAL_ERROR",
    message: err.message || "Something went wrong.",
  });
}

module.exports = { notFound, errorHandler };
