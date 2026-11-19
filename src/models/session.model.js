const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    ip: {
      type: String,
      required: true,
      maxlength: 64,
    },
    userAgent: {
      type: String,
      required: true,
      maxlength: 512,
    },
    revoked: {
      type: Boolean,
      default: false,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true, collection: "sessions" },
);

// Refresh-token hashes are looked up on every rotation/logout; expired sessions
// are removed automatically after their expiry time.
sessionSchema.index({ refreshToken: 1 }, { unique: true, name: "sessions_refreshToken_unique" });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "sessions_expiresAt_ttl" });

module.exports = mongoose.model("Session", sessionSchema, "sessions");
