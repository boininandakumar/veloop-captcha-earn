const AuditLog = require("../models/AuditLog");

async function log(action, { userId, referenceId, metadata, ip } = {}) {
  try {
    await AuditLog.create({ action, userId, referenceId, metadata, ip });
  } catch (err) {
    // Auditing must never break the main flow.
    console.error("[audit] failed to write log", err.message);
  }
}

module.exports = { log };
