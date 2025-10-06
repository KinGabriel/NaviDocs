import React, { useEffect, useMemo, useState } from "react";
import { toast } from 'react-hot-toast';
import { normalizeName, canSaveUser, validateUserRoleFields } from "../../utils/validations";
import { useParams } from "react-router-dom";
import { fetchUserAccountByIdAPI } from "../../api/adminAPI";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown2 from "../../components/dropdowns/dropdown2";
import defaultProfile from "../../assets/images/profile_picture.png";
import { useNavigate } from "react-router-dom";
import { ROLE_OPTIONS, SCHOOL_OPTIONS, DEPARTMENT_OPTIONS, YEAR_OPTIONS } from "../../utils/options";
import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];  


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

  // extra validation depending on role
  const { valid: extraValid, error: extraError } = validateUserRoleFields(form);
  const canSave = useMemo(() => canSaveUser(form) && extraValid, [form, extraValid]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    if (name === "firstname" || name === "lastname") {
      // allow only letters/spaces while typing (matches create user behavior)
      const filtered = value.replace(/[^a-zA-Z\s']/g, "");
      setForm((p) => ({ ...p, [name]: filtered }));
    } else if (name === "email") {
      setForm((p) => ({ ...p, email: value.replace(/\s+/g, "") }));
    }
  };

  const handleBlurName = (e) => {
    const { name, value } = e.target;
    if (value.trim()) {
      setForm((p) => ({ ...p, [name]: normalizeName(value) }));
    }
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
    setAlertMessage("");
  };

  // Save handler wired to PUT /api/admin/edit-user/:id
  const handleSave = async (e) => {
    e.preventDefault();

    if (!canSave) {
      toast.error(extraError || "Fill all required fields before saving.");
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

      toast.success("User updated successfully.");
      setTimeout(() => {
        navigate(-1);
      }, 1200);
    } catch (err) {
      console.error("Error updating user:", err?.response?.data || err?.message || err);
      toast.error(err?.response?.data?.message || "Failed to update user.");
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
      <div className="flex-1 p-10">
        <div className="bg-white rounded-xl shadow-lg p-10">
          {/* Title row (same style as Create User) */}
          <div className="mb-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 rounded-lg hover:bg-gray-100 -ml-2 shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-col">
              <h2 className="text-3xl font-bold text-black-800 tracking-widest uppercase leading-none">
                Edit User
              </h2>
              <span className="mt-2 inline-block h-1 w-25 bg-yellow-500 rounded" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-10">
            {/* Avatar picker — identical UX to Create User */}
            <div className="flex justify-center w-full lg:w-1/3">
              <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center relative">
                <label
                  htmlFor="profile_picture"
                  className="w-full h-full flex items-center justify-center cursor-pointer"
                  title="Upload profile photo"
                >
                  {selectedFile ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-48 h-48 object-cover rounded-full"
                    />
                  ) : photoPreview ? (
                    <img
                      src={`${API_URL}${photoPreview}`}
                      alt="Profile"
                      className="w-48 h-48 object-cover rounded-full"
                      onError={(e) => (e.currentTarget.src = defaultProfile)}
                    />
                  ) : (
                    <img
                      src={defaultProfile}
                      alt="Default Profile"
                      className="h-30 w-30 object-cover"
                    />
                  )}
                  <input
                    id="profile_picture"
                    name="profile_picture"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form fields */}
            <section className="w-full lg:w-2/3 space-y-8">
              {/* Personal Information */}
              <div>
                <h3 className="text-blue-900 font-bold text-lg mb-2">Personal Information:</h3>
                <form className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-medium text-sm">First Name</label>
                    <input
                      name="firstname"
                      type="text"
                      value={form.firstname}
                      onChange={handleInput}
                      onBlur={handleBlurName}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-sm">Last Name</label>
                    <input
                      name="lastname"
                      type="text"
                      value={form.lastname}
                      onChange={handleInput}
                      onBlur={handleBlurName}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-sm">Email</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleInput}
                      onKeyDown={(e) => e.key === " " && e.preventDefault()}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");
                        if (/\s/.test(pasted)) e.preventDefault();
                      }}
                      required
                      className="w-full p-2 border border-gray-300 rounded"
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
                <h3 className="text-blue-900 font-bold text-lg mb-2">Department &amp; Role:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

              {/* Actions (same style as Create User) */}
              <div className="flex justify-end gap-4">
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
                  className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
