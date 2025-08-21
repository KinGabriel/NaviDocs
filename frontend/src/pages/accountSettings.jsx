import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../layout/header";
import Sidebar from "../layout/sidebar";
import useUser from "../hooks/useUser";
import Loader from "../components/loader";
import PasswordInput from "../components/passwordinput.jsx"; // 👈 use the same eye-toggle input as Login
import { updateAccountSettingsAPI, updateUserPasswordAPI } from "../api/userAPI";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|biz|info|io|co|ph)$/i;

export default function AdminAccountSettings() {
  const user = useUser();
  const isLoading = !user; 

  // -------- Profile / personal info state --------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // -------- Password state --------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // -------- UI state --------
  const [savingInfo, setSavingInfo]       = useState(false);
  const [changingPw, setChangingPw]       = useState(false);
  const [infoMessage, setInfoMessage]     = useState(null);
  const [infoSuccess, setInfoSuccess]     = useState(false);
  const [pwMessage, setPwMessage]         = useState(null);
  const [pwSuccess, setPwSuccess]         = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Hydrate from current user
  useEffect(() => {
    if (!isLoading && user) {
      setFirstName(user.firstname || "");
      setLastName(user.lastname || "");
      setEmail(user.email || "");
      // If profile_picture is a relative path, prefix with API_URL
      let pic = user.profile_picture || null;
      if (pic && typeof pic === "string" && !pic.startsWith("http")) {
        pic = `${API_URL}${pic.startsWith("/") ? "" : "/"}${pic}`;
      }
      setPhotoPreview(pic);
    }
  }, [user, isLoading]);

  // Live photo preview
  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  // Helpers
  const canSaveInfo = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      emailRegex.test(email)
    );
  }, [firstName, lastName, email]);

  const pwRules = useMemo(() => {
    const issues = [];
    if (newPassword.length < 8) issues.push("At least 8 characters");
    if (!/[A-Z]/.test(newPassword)) issues.push("One uppercase letter");
    if (!/[a-z]/.test(newPassword)) issues.push("One lowercase letter");
    if (!/[0-9]/.test(newPassword)) issues.push("One number");
    return issues;
  }, [newPassword]);

  const canChangePw = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      newPassword.length > 0 &&
      confirmPassword.length > 0 &&
      newPassword === confirmPassword &&
      pwRules.length === 0
    );
  }, [currentPassword, newPassword, confirmPassword, pwRules]);

  // Format names like on CreateUser page
  const normalizeName = (val) =>
    val
      .replace(/^\s+/, "")
      .replace(/[^a-zA-Z\s]/g, "")
      .replace(/\s{2,}/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  // -------- Handlers --------
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!canSaveInfo) return;

    setSavingInfo(true);
    setInfoMessage(null);
    try {
      let payload;
      let response;
      if (photoFile) {
        payload = new FormData();
        payload.append("firstname", normalizeName(firstName));
        payload.append("lastname", normalizeName(lastName));
        payload.append("profile_picture", photoFile);
        response = await updateAccountSettingsAPI(user._id, payload);
      } else {
        payload = {
          firstname: normalizeName(firstName),
          lastname: normalizeName(lastName),
        };
        response = await updateAccountSettingsAPI(user._id, payload);
      }

      const updatedUser = {
        ...(user || {}),
        firstname: normalizeName(firstName),
        lastname: normalizeName(lastName),
        profile_picture: response.data.profile_picture || user.profile_picture,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("auth:change"));

      if (mountedRef.current) {
        setInfoSuccess(true);
        setInfoMessage("Profile updated successfully.");
        setPhotoFile(null);
        setFirstName(updatedUser.firstname);
        setLastName(updatedUser.lastname);
        setPhotoPreview(updatedUser.profile_picture || photoPreview);
      }
    } catch (err) {
      if (mountedRef.current) {
        setInfoSuccess(false);
        setInfoMessage(
          err?.response?.data?.message || err?.message || "Failed to update profile."
        );
      }
    } finally {
      if (mountedRef.current) setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!canChangePw) return;

    setChangingPw(true);
    setPwMessage(null);

    try {
      await updateUserPasswordAPI(user._id, newPassword);

      if (!mountedRef.current) return;
      setPwSuccess(true);
      setPwMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (!mountedRef.current) return;
      setPwSuccess(false);
      setPwMessage(
        err?.response?.data?.message || err?.message || "Failed to update password."
      );
    } finally {
      if (!mountedRef.current) return;
      setChangingPw(false);
    }
  };

  // ---------- Loading ----------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          {/* dashboard-style wrapper */}
          <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
            <div className="flex-1 flex items-center justify-center">
              <Loader message="Loading account…" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Page ----------
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Account Settings" />
        {/* dashboard-style wrapper */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Title (semibold for consistency with other tabs) */}
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase">ACCOUNT SETTINGS</h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Left: avatar + name/role */}
              <section className="flex flex-col items-center">
                <div className="w-44 h-44 rounded-full overflow-hidden bg-gray-100 border">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Photo</div>
                  )}
                </div>
                <label className="mt-3 text-sm text-blue-700 hover:underline cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  Upload Photo
                </label>

                <div className="mt-6 text-center">
                  <div className="text-2xl font-semibold">
                    {normalizeName(`${firstName || user?.firstname || ""} ${lastName || user?.lastname || ""}`)}
                  </div>
                  <div className="text-md text-gray-500 ">{user?.role?.name || "Admin"}</div>
                </div>
              </section>

              {/* Right: forms */}
              <section className="lg:col-span-2 space-y-10">
                {/* Personal Information */}
                <div>
                  <h2 className="text-2xl font-semibold text-[#0035DA] mb-4">Personal Information: </h2>

                  {infoMessage && (
                    <div className={`mb-4 rounded border px-3 py-2 text-sm ${infoSuccess ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {infoMessage}
                    </div>
                  )}

                  <form onSubmit={handleSaveInfo} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={(e) => setFirstName(normalizeName(e.target.value))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onBlur={(e) => setLastName(normalizeName(e.target.value))}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full border border-gray-200 bg-gray-100 rounded px-3 py-2 cursor-not-allowed text-gray-500"
                        value={email}
                        readOnly
                        tabIndex={-1}
                        aria-readonly="true"
                      />
                      <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={!canSaveInfo || savingInfo}
                        className={`px-5 py-2 rounded text-white font-semibold transition ${
                          canSaveInfo && !savingInfo
                          ? "bg-[#0035DA] hover:bg-[#043485]" // unified blue
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {savingInfo ? "Saving…" : "Save Changes"}
                    </button>

                    </div>
                  </form>
                </div>

                {/* Change Password */}
                <div>
                  <h2 className="text-2xl font-semibold text-[#0035DA] mb-4">Change Password: </h2>
                  {pwMessage && (
                    <div className={`mb-4 rounded border px-3 py-2 text-sm ${pwSuccess ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {pwMessage}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current Password</label>
                      <PasswordInput
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <PasswordInput
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                      {newPassword.length > 0 && pwRules.length > 0 && (
                        <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                          {pwRules.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm Password</label>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                      />
                      {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                        <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                          type="submit"
                          disabled={!canChangePw || changingPw}
                          className={`px-5 py-2 rounded text-white font-semibold transition ${
                            canChangePw && !changingPw
                              ? "bg-[#0035DA] hover:bg-[#043485]" // unified blue
                              : "bg-gray-400 cursor-not-allowed"
                        }`}
                      >
                        {changingPw ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
