import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Loader from "../../components/loader";
import { fetchUsersAccountsAPI } from "../../api/adminAPI";
import SearchBar from '../../components/searchbar';
import Table from '../../components/table';
import Dropdown from '../../components/dropdown';
import usePagination from '../../hooks/usePagination';

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
      setPhotoPreview(user.profile_picture || null);
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
      // 1) If a photo is selected, upload it first to get a URL
      let profileUrl = user?.profile_picture || null;
      if (photoFile) {
        // const uploaded = await uploadProfileImageAPI(photoFile);
        // profileUrl = uploaded.url;
        // Mock:
        profileUrl = photoPreview;
      }

      // 2) Update account info
      const payload = {
        firstname: normalizeName(firstName),
        lastname : normalizeName(lastName),
        email    : email.trim(),
        profile_picture: profileUrl,
      };

      // await updateAccountInfoAPI(payload);
      // Mock success:
      await new Promise((r) => setTimeout(r, 600));

      // Update localStorage user so useUser() listeners react
      const nextUser = { ...(user || {}), ...payload };
      localStorage.setItem("user", JSON.stringify(nextUser));
      window.dispatchEvent(new Event("auth:change"));

      if (!mountedRef.current) return;
      setInfoSuccess(true);
      setInfoMessage("Profile updated successfully.");
      setPhotoFile(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setInfoSuccess(false);
      setInfoMessage(err?.message || "Failed to update profile.");
    } finally {
      if (!mountedRef.current) return;
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!canChangePw) return;

    setChangingPw(true);
    setPwMessage(null);

    try {
      // await updatePasswordAPI({ currentPassword, newPassword });
      // Mock:
      await new Promise((r) => setTimeout(r, 600));

      if (!mountedRef.current) return;
      setPwSuccess(true);
      setPwMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (!mountedRef.current) return;
      setPwSuccess(false);
      setPwMessage(err?.message || "Failed to update password.");
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
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ""))}
                        onKeyDown={(e) => e.key === " " && e.preventDefault()}
                        required
                      />
                      {!emailRegex.test(email) && email.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">Please enter a valid email (e.g., name@example.com).</p>
                      )}
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
                      <input
                        type="password"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input
                        type="password"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
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
                      <input
                        type="password"
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
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
