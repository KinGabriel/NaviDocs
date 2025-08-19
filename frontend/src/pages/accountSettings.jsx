import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../layout/header";
import Sidebar from "../layout/sidebar";
import useUser from "../hooks/useUser";
import Loader from "../components/loader";
import { updateAccountSettingsAPI, updateUserPasswordAPI } from "../api/userAPI";
import SearchBar from '../components/searchbar';
import Table from '../components/table';
import Dropdown from '../components/dropdown';
import usePagination from '../hooks/usePagination';
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
  // Show/hide password toggles
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center">
            <Loader message="Loading account…" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Account Settings" />
        <main className="flex-1 p-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Title */}
            <div className="mb-10">
              <h1 className="text-3xl font-extrabold tracking-wide text-black">ACCOUNT SETTINGS</h1>
              <div className="w-24 h-1 bg-yellow-400 mt-2 rounded" />
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
                  <div className="text-lg font-semibold">
                    {normalizeName(`${firstName || user?.firstname || ""} ${lastName || user?.lastname || ""}`)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{user?.role?.name || "Admin"}</div>
                </div>
              </section>

              {/* Right: forms */}
              <section className="lg:col-span-2 space-y-10">
                {/* Personal Information */}
                <div>
                  <h2 className="text-lg font-semibold text-[#063c8d] mb-4">Personal Information:</h2>
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
                            ? "bg-[#003DA5] hover:bg-[#002B7F]"
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
                  <h2 className="text-lg font-semibold text-[#063c8d] mb-4">Change Password:</h2>
                  {pwMessage && (
                    <div className={`mb-4 rounded border px-3 py-2 text-sm ${pwSuccess ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {pwMessage}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowCurrentPw(v => !v)}
                          aria-label={showCurrentPw ? "Hide password" : "Show password"}
                        >
                          {showCurrentPw ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#9b9b9b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962"/><circle cx="12" cy="12" r="3"/></g></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><path fill="#9b9b9b" d="M8 11c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3m0-5c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/><path fill="#9b9b9b" d="M8 13c-3.19 0-5.99-1.94-6.97-4.84a.44.44 0 0 1 0-.32C2.01 4.95 4.82 3 8 3s5.99 1.94 6.97 4.84c.04.1.04.22 0 .32C13.99 11.05 11.18 13 8 13M2.03 8c.89 2.4 3.27 4 5.97 4s5.07-1.6 5.97-4C13.08 5.6 10.7 4 8 4S2.93 5.6 2.03 8"/><path fill="#9b9b9b" d="M14 14.5a.47.47 0 0 1-.35-.15l-12-12c-.2-.2-.2-.51 0-.71s.51-.2.71 0l11.99 12.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"/></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPw ? "text" : "password"}
                          className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowNewPw(v => !v)}
                          aria-label={showNewPw ? "Hide password" : "Show password"}
                        >
                          {showNewPw ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#9b9b9b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962"/><circle cx="12" cy="12" r="3"/></g></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><path fill="#9b9b9b" d="M8 11c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3m0-5c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/><path fill="#9b9b9b" d="M8 13c-3.19 0-5.99-1.94-6.97-4.84a.44.44 0 0 1 0-.32C2.01 4.95 4.82 3 8 3s5.99 1.94 6.97 4.84c.04.1.04.22 0 .32C13.99 11.05 11.18 13 8 13M2.03 8c.89 2.4 3.27 4 5.97 4s5.07-1.6 5.97-4C13.08 5.6 10.7 4 8 4S2.93 5.6 2.03 8"/><path fill="#9b9b9b" d="M14 14.5a.47.47 0 0 1-.35-.15l-12-12c-.2-.2-.2-.51 0-.71s.51-.2.71 0l11.99 12.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"/></svg>
                          )}
                        </button>
                      </div>
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
                      <div className="relative">
                        <input
                          type={showConfirmPw ? "text" : "password"}
                          className="w-full border border-gray-300 rounded px-3 py-2 pr-10"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowConfirmPw(v => !v)}
                          aria-label={showConfirmPw ? "Hide password" : "Show password"}
                        >
                          {showConfirmPw ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><g fill="none" stroke="#9b9b9b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M21.257 10.962c.474.62.474 1.457 0 2.076C19.764 14.987 16.182 19 12 19s-7.764-4.013-9.257-5.962a1.69 1.69 0 0 1 0-2.076C4.236 9.013 7.818 5 12 5s7.764 4.013 9.257 5.962"/><circle cx="12" cy="12" r="3"/></g></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16"><path fill="#9b9b9b" d="M8 11c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3m0-5c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"/><path fill="#9b9b9b" d="M8 13c-3.19 0-5.99-1.94-6.97-4.84a.44.44 0 0 1 0-.32C2.01 4.95 4.82 3 8 3s5.99 1.94 6.97 4.84c.04.1.04.22 0 .32C13.99 11.05 11.18 13 8 13M2.03 8c.89 2.4 3.27 4 5.97 4s5.07-1.6 5.97-4C13.08 5.6 10.7 4 8 4S2.93 5.6 2.03 8"/><path fill="#9b9b9b" d="M14 14.5a.47.47 0 0 1-.35-.15l-12-12c-.2-.2-.2-.51 0-.71s.51-.2.71 0l11.99 12.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"/></svg>
                          )}
                        </button>
                      </div>
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
                            ? "bg-[#003DA5] hover:bg-[#002B7F]"
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
          </div>
        </main>
      </div>
    </div>
  );
}
