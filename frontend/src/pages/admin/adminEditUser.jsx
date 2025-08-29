import React, { useEffect, useMemo, useState } from "react";
import { normalizeName, canSaveUser, validateUserRoleFields } from "../../utils/validations";
import { useParams } from "react-router-dom";
import { fetchUserAccountByIdAPI } from "../../api/adminAPI";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown2 from "../../components/dropdown2";
import defaultProfile from "../../assets/images/profile_picture.png";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
import { ROLE_OPTIONS, SCHOOL_OPTIONS, DEPARTMENT_OPTIONS, YEAR_OPTIONS } from "../../utils/options";
import axios from "axios";


export default function AdminEditUser() {
  const { id } = useParams();
  const user = useUser();
  const navigate = useNavigate();

  // --- form state ---
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    email: "",
    role: {
      name: "",
      school: "",
      department: "",
    },
    year: "—",
  });
  const [loadingUser, setLoadingUser] = useState(true);
  const [errorUser, setErrorUser] = useState(null);
  // Alert state for feedback
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error"); // 'success' or 'error'

  // Fetch user details by id from URL
  useEffect(() => {
    if (!id) return;
    setLoadingUser(true);
    fetchUserAccountByIdAPI(id)
      .then((data) => {
        setForm({
          firstname: data.firstname || "",
          lastname: data.lastname || "",
          email: data.email || "",
          role: {
            name: data.role?.name || "",
            school: data.role?.school || "",
            department: data.role?.department || "",
          },
          year: data.year || "—",
        });
        setPhotoPreview(data.profile_picture || null);
        setErrorUser(null);
      })
      .catch((err) => {
        setErrorUser(err.message || "Failed to fetch user details.");
      })
      .finally(() => setLoadingUser(false));
  }, [id]);

  const { valid: extraValid, error: extraError } = validateUserRoleFields(form);
  const canSave = useMemo(() => canSaveUser(form) && extraValid, [form, extraValid]);
  const [saveAttempted, setSaveAttempted] = useState(false);

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "firstname" || name === "lastname") {
      setForm((p) => ({ ...p, [name]: value }));
    } else if (name === "email") {
      setForm((p) => ({ ...p, email: value.replace(/\s+/g, "") }));
    }
  };

  const handleBlurName = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: normalizeName(value) }));
  };

  const setRoleField = (key, val) => {
    setForm((prev) => {
      const nextRole = { ...prev.role, [key]: val };
      if (key === "school") nextRole.department = "";
      const next = { ...prev, role: nextRole };
      if (key === "name" && !["Faculty", "Document Controller", "Department Head"].includes(val)) {
        next.year = "—";
      }
      return next;
    });
  };

  const handleClear = () => {
    setForm({
      firstname: "",
      lastname: "",
      email: "",
      role: { name: "", school: "", department: "" },
      year: "—",
    });
    setPhotoPreview(null);
    setSelectedFile(null);
  };

// Save handler wired to PUT /api/admin/edit-user/:id
  const handleSave = async (e) => {
    e.preventDefault();
    setSaveAttempted(true);

    if (!canSave) {
      setAlertType("error");
      setAlertMessage(extraError || "Fill all required fields before saving.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("firstname", form.firstname);
      formData.append("lastname", form.lastname);
      formData.append("email", form.email);
      formData.append("role", form.role.name || "");
      formData.append("school", form.role.school || "");
      formData.append("department", form.role.department || "");
      if (selectedFile) formData.append("profile_picture", selectedFile);

      await axios.patch(`${API_URL}/api/admin/edit-user/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      setAlertType("success");
      setAlertMessage("User updated successfully.");
      setTimeout(() => {
        setAlertMessage("");
        navigate(-1);
      }, 1200);
    } catch (err) {
      console.error("Error updating user:", err?.response?.data || err?.message || err);
      setAlertType("error");
      setAlertMessage(err?.response?.data?.message || "Failed to update user.");
    }
  };

  const fullName = `${normalizeName(form.firstname)} ${normalizeName(form.lastname)}`.trim();

  const showSchool = ["Faculty", "Dean", "Secretary", "Document Controller", "Department Head"].includes(form.role.name);
  const showDepartment = ["Faculty", "Document Controller", "Department Head"].includes(form.role.name);
  const showYear = ["Student"].includes(form.role.name);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading user details…
          </div>
        </div>
      </div>
    );
  }
  if (errorUser) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center text-red-500">
            {errorUser}
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-200 flex flex-col">
    <Header user={user} />
    <div className="flex flex-1">
      {/* Sidebar */}
      <Sidebar user={user} active="Edit User" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
        <main className="flex-1 p-10">
          {/* Title */}
          <div className="mb-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 -ml-2 shrink-0"
              aria-label="Go back"
            >
              {/* left arrow icon */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-col">
              <h1 className="text-3xl font-extrabold tracking-wide text-black">EDIT USER</h1>
              <span className="mt-2 inline-block h-1 w-24 bg-yellow-400 rounded" />
            </div>
          </div>

          {/* Alert */}
          {alertMessage && (
            <div
              className={`mb-6 p-3 rounded border text-base w-full transition-opacity duration-300 ${
                alertType === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {alertMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left: Avatar */}
            <section className="flex flex-col items-center">
              <div className="w-44 h-44 rounded-full overflow-hidden bg-gray-100 border">
                {photoPreview ? (
                  <img src={`${API_URL}${photoPreview}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img src={defaultProfile} alt="Default" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="mt-6 text-center">
                <div className="text-lg font-semibold">{fullName || "—"}</div>
                <div className="text-xs text-gray-500 leading-tight">
                  {form.role?.department ? `BS ${form.role.department?.split(" ")[0] || ""}` : ""}
                </div>
                <div className="text-sm text-gray-500 mt-1">{form.role?.name || "—"}</div>
              </div>

              {/* Upload */}
              <div className="mt-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
              </div>
            </section>

            {/* Right: Form Fields */}
            <section className="lg:col-span-2 space-y-10">
              {/* Personal Information */}
              <div>
                <h2 className="text-base font-semibold text-[#063c8d] mb-4">Personal Information:</h2>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">First Name</label>
                    <input
                      name="firstname"
                      type="text"
                      value={form.firstname}
                      onChange={handleInput}
                      onBlur={handleBlurName}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Last Name</label>
                    <input
                      name="lastname"
                      type="text"
                      value={form.lastname}
                      onChange={handleInput}
                      onBlur={handleBlurName}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleInput}
                      onKeyDown={(e) => e.key === " " && e.preventDefault()}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      required
                    />
                  </div>
                  {showSchool && (
                    <Dropdown2
                      label="School"
                      value={form.role.school}
                      onChange={(val) => setRoleField("school", val)}
                      options={SCHOOL_OPTIONS}
                      placeholder="Select School"
                    />
                  )}
                  {showYear && (
                    <Dropdown2
                      label="Year"
                      value={form.year}
                      onChange={(val) => setForm((p) => ({ ...p, year: val }))}
                      options={YEAR_OPTIONS}
                      placeholder="Select Year"
                    />
                  )}
                </form>
              </div>

              {/* Department & Role */}
              <div>
                <h2 className="text-base font-semibold text-[#063c8d] mb-4">Department &amp; Role:</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {showDepartment && (
                    <Dropdown2
                      label="Department"
                      value={form.role.department}
                      onChange={(val) => setRoleField("department", val)}
                      options={DEPARTMENT_OPTIONS[form.role.school] || []}
                      placeholder="Select Department"
                    />
                  )}
                  <Dropdown2
                    label="Role"
                    value={form.role.name}
                    onChange={(val) => setRoleField("name", val)}
                    options={ROLE_OPTIONS}
                    placeholder="Select Role"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Save & Clear Buttons at Bottom-Right */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`px-6 py-2 rounded text-white ${
                canSave ? "bg-blue-700 hover:bg-blue-800" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Save
            </button>
          </div>
        </main>
      </div>
    </div>
  </div>
);
}
