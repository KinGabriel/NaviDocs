import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    ip: { type: String, required: true },
    login_time: { type: Date, default: Date.now },  
    logout_time: { type: Date, default: null }
}, { timestamps: true });

const Log = mongoose.model("Log", logSchema);

export default Log;