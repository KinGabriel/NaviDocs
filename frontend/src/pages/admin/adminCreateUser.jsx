import React, { useState } from "react";
import { normalizeName, canSaveUser, validateUserRoleFields } from "../../utils/validations";
import Header from '../../layout/headers/header';
import Sidebar from '../../layout/sidebars/sidebar';
import useUser from '../../hooks/useUser';
import Dropdown2 from "../../components/dropdowns/dropdown2";
import defaultProfile from '../../assets/images/profile_picture.png';
import Loader from '../../components/loader';
import { createUserAccountAPI } from '../../api/adminAPI'; 
import { ROLE_OPTIONS, SCHOOL_OPTIONS, DEPARTMENT_OPTIONS, YEAR_OPTIONS } from "../../utils/options";

export default function CreateUser() {
  const user = useUser();
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    school: '',
    department: '',
    role: {
      name: '',
      school: '',
      department: ''
    }
  });

  const [errors, setErrors] = useState({
    firstname: '',
    lastname: '',
    email: ''
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("error"); // 'success' or 'error'


  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'firstname' || name === 'lastname') {
      // Allow only letters, spaces, and apostrophes when typing
      newValue = newValue.replace(/[^a-zA-Z\s']/g, '');
      // Do not normalize here, just filter
      if (!newValue.trim()) {
        setErrors(prev => ({ ...prev, [name]: `${name === 'firstname' ? 'First' : 'Last'} name is required.` }));
      } else {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }

    if (name === 'email') {
      newValue = newValue.replace(/\s+/g, '');

      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|biz|info|io|co|ph)$/i;

      if (!emailRegex.test(newValue)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email (e.g. name@example.com).' }));
      } else {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    if ((name === 'firstname' || name === 'lastname') && value.trim()) {
      setFormData(prev => ({ ...prev, [name]: normalizeName(value) }));
    }
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleClear = () => {
    setFormData({
      firstname: '',
      lastname: '',
      email: '',
      school: '',
      department: '',
      role: { name: '', school: '', department: '' }
    });
    setErrors({ firstname: '', lastname: '', email: '' });
    setImage(null);
    setAlertMessage("");
  };

  // Role-based required fields validation
  const { valid: extraValid, error: extraError } = validateUserRoleFields(formData);
  const isFormValid = canSaveUser({ ...formData, role: formData.role }) && !errors.firstname && !errors.lastname && !errors.email && extraValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setAlertMessage("Please correct the errors before submitting and ensure all required fields are filled.");
      setAlertType("error");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    const data = new FormData();
    data.append('firstname', formData.firstname);
    data.append('lastname', formData.lastname);
    data.append('email', formData.email);
    data.append('school', formData.school);
    data.append('department', formData.role.department);
    data.append('role', JSON.stringify(formData.role));
    if (image) data.append('profile_picture', image);

    try {
      // Use the API function instead of direct fetch
      const result = await createUserAccountAPI(data);
      setLoading(false);
      handleClear();
      setAlertType("success");
      setAlertMessage('User created successfully');
      setTimeout(() => {
        setAlertMessage("");
      }, 5000);
    } catch (error) {
      setLoading(false);
      setAlertType("error");
      setAlertMessage(error.message || 'Failed to create user');
      console.error('Create user error:', error);
    }
  };

  const showSchool = ["Faculty", "Dean", "Secretary", "Document Controller", "Department Head"].includes(formData.role.name);
  const showDepartment = ["Faculty", "Document Controller", "Department Head"].includes(formData.role.name);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow-lg p-10">
            <h2 className="text-3xl font-bold text-black-800 tracking-widest uppercase mb-2">Create New User</h2>
            <div className="w-25 h-1 bg-yellow-500 mb-8"></div>
            {(alertMessage && alertType === 'success') && (
              <div className="mb-6 p-3 rounded border border-green-200 bg-green-50 text-green-700 text-base w-full transition-opacity duration-300">
                {alertMessage}
              </div>
            )}
            {(alertMessage && alertType === 'error') && (
              <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-base w-full transition-opacity duration-300">
                {alertMessage}
              </div>
            )}
           

            {loading ? (
              <Loader message="Submitting..." />
            ) : (
              <div className="flex flex-col lg:flex-row items-start gap-10">
                <div className="flex justify-center w-full lg:w-1/3">
                  <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center relative group">
                    <label htmlFor="profile_picture" className="w-full h-full flex items-center justify-center cursor-pointer">
                      {image ? (
                        <img src={URL.createObjectURL(image)} alt="Preview" className="w-48 h-48 object-cover rounded-full" />
                      ) : (
                        <img src={defaultProfile} alt="Default Profile" className="h-30 w-30 object-cover" />
                      )}
                      <input id="profile_picture" name="profile_picture" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="w-full lg:w-2/3 space-y-8" encType="multipart/form-data">
                  <div>
                    <h3 className="text-blue-900 font-bold text-lg mb-2">Personal Information:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      <div>
                        <label className="block font-medium text-sm">Email</label>
                        <input
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          onKeyDown={(e) => {
                            if (e.key === ' ') e.preventDefault();
                          }}
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

                  <div>
                    <h3 className="text-blue-900 font-bold text-lg mb-2">Department & Role:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button type="button" onClick={handleClear} className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Clear</button>
                    <button type="submit" className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50" disabled={!isFormValid || loading}>Add User</button>
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
