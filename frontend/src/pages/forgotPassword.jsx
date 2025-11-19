import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import sluLogo from "../assets/images/slulogo.png";

export default function ForgotPassword() {
  const navigate = useNavigate();

  // form state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // ui state
  const [step, setStep] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // resend timer
  const RESEND_SECONDS = 45;
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // validations
  const isValidEmail = (val) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
  const isStrongPw = (val) => {
    // At least 8 characters, one uppercase letter, one number
    return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val);
  };

  const requestOTP = async (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) return toast.error("Enter a valid email.");
    setLoading(true);
    try {
      const resp = await fetch(`/api/auth/forgot-password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (resp.status === 429) {
        const data = await resp.json().catch(() => ({}));
        const retry = data?.retryAfter ?? RESEND_SECONDS;
        setCooldown(retry);
        toast.error(data?.message || `Please wait ${retry}s before requesting again.`);
        return;
      }
      setStep(2);
      setCooldown(RESEND_SECONDS);
      toast.success("An OTP code has been sent to your email.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to request OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (cooldown > 0) return;
    if (!isValidEmail(email)) return toast.error("Enter a valid email first.");
    try {
      const resp = await fetch(`/api/auth/forgot-password/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (resp.status === 429) {
        const data = await resp.json().catch(() => ({}));
        const retry = data?.retryAfter ?? RESEND_SECONDS;
        setCooldown(retry);
        toast.error(data?.message || `Please wait ${retry}s before resending.`);
        return;
      }
      setCooldown(RESEND_SECONDS);
      toast.success("An OTP code has been re-sent to your email.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to resend OTP. Please try again.");
    }
  };

  const submitNewPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) return toast.error("Enter the 6-digit OTP.");
    if (!isStrongPw(newPw)) return toast.error("Password must be at least 8 characters with one uppercase letter and one number.");
    if (newPw !== confirmPw) return toast.error("Passwords do not match.");

    setLoading(true);
    try {
      const resp = await fetch(`/api/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword: newPw }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(data?.message || "Failed to update password.");
        return;
      }
      toast.success("Password updated. You can now log in.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300 p-6">
      <div className="relative w-full md:w-1/2 max-w-3xl bg-white rounded-2xl shadow-xl px-6 sm:px-10 pt-16 pb-8">
        {/* Icon top-center */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white shadow-lg flex items-center justify-center border">
            <img src={sluLogo} alt="Logo" className="w-14 sm:w-16 h-14 sm:h-16 object-contain" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a237e]">Forgot Password</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {step === 1 ? "We’ll send an OTP to your email." : "Enter the OTP and set your new password."}
          </p>
        </div>

        {/* Ask email and send OTP */}
        {step === 1 && (
          <form onSubmit={requestOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="you@school.edu"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-700 to-blue-400 text-white font-semibold shadow-md active:scale-[.98] disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-600">Remembered your password?</span>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[#1a237e] font-semibold hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Confirm OTP + new password */}
        {step === 2 && (
          <form onSubmit={submitNewPassword} className="space-y-4">
            {/* Email (locked for clarity) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-600"
              />
            </div>

            {/* Confirm OTP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Check your inbox and spam folder.</span>
                <button
                  type="button"
                  onClick={resendOTP}
                  disabled={cooldown > 0}
                  className={`font-semibold ${cooldown > 0 ? "opacity-50 cursor-not-allowed" : "text-blue-700 hover:underline"}`}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  placeholder="At least 8 characters, 1 uppercase, 1 number"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  aria-label="Toggle password visibility"
                >
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className={`mt-1 text-xs ${isStrongPw(newPw) ? "text-green-600" : "text-gray-500"}`}>
                {isStrongPw(newPw) ? "Looks good." : "Must have 8+ chars, 1 uppercase, 1 number."}
              </p>
            </div>

            {/* Re-Type Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Re-Type Password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter new password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((s) => !s)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPw.length > 0 && (
                <p className={`mt-1 text-xs ${newPw === confirmPw ? "text-green-600" : "text-red-600"}`}>
                  {newPw === confirmPw ? "Passwords match." : "Passwords do not match."}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-700 to-blue-400 text-white font-semibold shadow-md active:scale-[.98] disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-600">Back to login?</span>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-[#1a237e] font-semibold hover:underline"
              >
                Go to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}