import mongoose from "mongoose";

const passwordResetTokenSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
    lastSentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL index for automatic cleanup (expiresAt)
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordResetToken", passwordResetTokenSchema);
