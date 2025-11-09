import React, { useState } from "react";
import { toast } from 'react-hot-toast';
import { normalizeName, canSaveUser, validateUserRoleFields } from "../../utils/validations";
import Header from '../../layout/headers/header';
import Sidebar from '../../layout/sidebars/sidebar';
import useUser from '../../hooks/useUser';
import Dropdown2 from "../../components/dropdowns/dropdown2";
import defaultProfile from '../../assets/images/profile_picture.png';
import Loader from '../../components/loader';
import { createUserAccountAPI } from '../../api/adminAPI'; 
import { ROLE_OPTIONS, SCHOOL_OPTIONS, DEPARTMENT_OPTIONS } from "../../utils/options";

export default function CreateUser() {
  const user = useUser();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    school: '',
    department: '',
    role: { name: '', school: '', department: '' },
    // permissions: {
    //   createTemplate: false,
    //   endorseTemplate: false,
    //   endorseTemplateForApproval: false,
    //   approveTemplate: false,
    //   publishTemplate: false,
    //   unpublishTemplate: false,
    //   assignSubmission: false,
    // }
  });

  const [errors, setErrors] = useState({ firstname: '', lastname: '', email: '' });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'firstname' || name === 'lastname') {
      newValue = newValue.replace(/[^a-zA-Z\s']/g, '');
      if (!newValue.trim()) {
        setErrors(prev => ({ ...prev, [name]: `${name === 'firstname' ? 'First' : 'Last'} name is required.` }));
      } else setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'email') {
      newValue = newValue.replace(/\s+/g, '');
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|biz|info|io|co|ph)$/i;
      if (!newValue) setErrors(prev => ({ ...prev, email: 'Email is required.' }));
      else if (!emailRegex.test(newValue)) setErrors(prev => ({ ...prev, email: 'Please enter a valid email (e.g. name@example.com).' }));
      else setErrors(prev => ({ ...prev, email: '' }));
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if ((name === 'firstname' || name === 'lastname') && value.trim()) {
      setFormData(prev => ({ ...prev, [name]: normalizeName(value) }));
    }
  };

  const handleClear = () => {
    setFormData({
      firstname: '', lastname: '', email: '', school: '', department: '',
      role: { name: '', school: '', department: '' },
      // permissions: {
      //   createTemplate: false, endorseTemplate: false, endorseTemplateForApproval: false,
      //   approveTemplate: false, publishTemplate: false, unpublishTemplate: false, assignSubmission: false
      // }
    });
    setErrors({ firstname: '', lastname: '', email: '' });
    setImage(null);
  };

  const { valid: extraValid } = validateUserRoleFields(formData);
  const isFormValid = canSaveUser({ ...formData, role: formData.role }) && !errors.firstname && !errors.lastname && !errors.email && extraValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please correct the errors before submitting and ensure all required fields are filled.");
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('firstname', formData.firstname);
    data.append('lastname', formData.lastname);
    data.append('email', formData.email);
    data.append('school', formData.school);
    data.append('department', formData.role.department);
    data.append('role', JSON.stringify(formData.role));
    // data.append('permissions', JSON.stringify(formData.permissions));
    if (image) data.append('profile_picture', image);

    try {
      await createUserAccountAPI(data);
      handleClear();
      toast.success('User created successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
      console.error('Create user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const showSchool = ["Faculty", "Dean", "Secretary", "Department Head"].includes(formData.role.name);
  const showDepartment = ["Faculty", "Department Head"].includes(formData.role.name);

  // const togglePermission = (key) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
  //   }));
  // };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <Sidebar user={user} />
        <main className="flex-1 p-4 sm:p-6 lg:p-10">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 min-h-[900px]">
            <h2 className="text-2xl sm:text-3xl font-bold text-black-800 tracking-widest uppercase mb-2 text-center sm:text-left">
              Create New User
            </h2>
            <div className="w-20 sm:w-25 h-1 bg-yellow-500 mb-6 sm:mb-8 mx-auto sm:mx-0"></div>

            {loading ? (
              <Loader message="Submitting..." />
            ) : (
              <div className="flex flex-col lg:flex-row items-start gap-8">
                {/* LEFT: Photo */}
                <div className="flex justify-center w-full lg:w-1/3">
                  <section className="flex flex-col items-center">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <img src={defaultProfile} alt="Default Profile" className="w-24 h-24 sm:w-32 sm:h-32 object-contain opacity-90" />
                      )}
                    </div>
                    <label className="mt-3 text-sm text-blue-700 hover:underline cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setPhotoFile(file || null);
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setPhotoPreview(reader.result);
                            reader.readAsDataURL(file);
                          } else setPhotoPreview(null);
                        }}
                      />
                      Upload Photo
                    </label>
                  </section>
                </div>

                {/* RIGHT: Form */}
                <form onSubmit={handleSubmit} className="w-full lg:w-2/3 space-y-6 sm:space-y-8" encType="multipart/form-data">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-blue-900 font-bold text-lg mb-2">Personal Information:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="block font-medium text-sm">First Name</label>
                        <input
                          name="firstname"
                          type="text"
                          value={formData.firstname}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.firstname && <p className="text-red-500 text-sm mt-1">{errors.firstname}</p>}
                      </div>
                      <div>
                        <label className="block font-medium text-sm">Last Name</label>
                        <input
                          name="lastname"
                          type="text"
                          value={formData.lastname}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.lastname && <p className="text-red-500 text-sm mt-1">{errors.lastname}</p>}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-sm">Email</label>
                        <input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          onKeyDown={(e) => e.key === ' ' && e.preventDefault()}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (/\s/.test(pasted)) e.preventDefault();
                          }}
                          required
                          className="w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>

                      {showSchool && (
                        <Dropdown2
                          label="School"
                          value={formData.role.school}
                          onChange={(val) =>
                            setFormData(prev => ({
                              ...prev,
                              role: { ...prev.role, school: val },
                              school: val,
                              department: ''
                            }))
                          }
                          options={SCHOOL_OPTIONS}
                          placeholder="Select School"
                        />
                      )}
                    </div>
                  </div>

                  {/* Department & Role */}
                  <div>
                    <h3 className="text-blue-900 font-bold text-lg mb-2">Department & Role:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <Dropdown2
                        label="Role"
                        value={formData.role.name}
                        onChange={(val) =>
                          setFormData(prev => ({
                            ...prev,
                            role: { ...prev.role, name: val }
                          }))
                        }
                        options={ROLE_OPTIONS}
                        placeholder="Select Role"
                      />

                      {showDepartment && (
                        <Dropdown2
                          label="Department"
                          value={formData.role.department}
                          onChange={(val) =>
                            setFormData(prev => ({
                              ...prev,
                              role: { ...prev.role, department: val }
                            }))
                          }
                          options={DEPARTMENT_OPTIONS[formData.school] || []}
                          placeholder="Select Department"
                        />
                      )}
                    </div>
                  </div>

                  {/* Permissions */}
                  {/* 
                  <div>
                    <h3 className="text-blue-900 font-bold text-lg mb-2">Permissions:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                      {[
                        ['createTemplate', 'Create template'],
                        ['endorseTemplate', 'Endorse a template'],
                        ['endorseTemplateForApproval', 'Endorse a template for approval'],
                        ['approveTemplate', 'Approve a template'],
                        ['publishTemplate', 'Publish a template'],
                        ['unpublishTemplate', 'Unpublish a template'],
                        ['assignSubmission', 'Assign a submission'],
                      ].map(([key, label]) => (
                        <label key={key} className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={formData.permissions[key]}
                            onChange={() => togglePermission(key)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  */}

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-4">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 w-full sm:w-auto"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 w-full sm:w-auto"
                      disabled={!isFormValid || loading}
                    >
                      Add User
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
