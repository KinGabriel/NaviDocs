import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    ip: { type: String, required: true },
    // Structured UA fields
    browserName: { type: String, index: true, default: null },
    browserVersion: { type: String, default: null },
    osName: { type: String, index: true, default: null },
    osVersion: { type: String, default: null },
    deviceType: { type: String, enum: ['desktop','mobile','tablet','bot','unknown'], default: 'unknown', index: true },

    login_time: { type: Date, default: Date.now },
    logout_time: { type: Date, default: null }
}, { timestamps: true });

// Indexes to improve query performance for admin UI and aggregations
logSchema.index({ userId: 1, login_time: -1 });
logSchema.index({ ip: 1 });
logSchema.index({ browserName: 1 });

const Log = mongoose.model("Log", logSchema);

export default Log;