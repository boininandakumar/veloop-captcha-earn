const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    action: {
      type: String,
      enum: [
        "CHALLENGE_CREATED",
        "CHALLENGE_VERIFIED",
        "REWARD_CREATED",
        "REWARD_CLAIMED",
        "DUPLICATE_ATTEMPT",
        "INVALID_ATTEMPT",
        "EXPIRED_CHALLENGE",
        "SUSPICIOUS_REQUEST",
      ],
      required: true,
    },
    referenceId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
