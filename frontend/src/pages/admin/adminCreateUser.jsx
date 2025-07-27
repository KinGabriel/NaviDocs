import React, { useState } from "react";
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';
import Dropdown2 from "../../components/dropdown2";
import defaultProfile from '../../assets/images/profile_picture.png';
import Loader from '../../components/loader';

const ROLE_OPTIONS = [
  "Admin",
  "Faculty",
  "Dean",
  "Department Head",
  "Secretary",
  "Document Controller"
];

const SCHOOL_OPTIONS = [
  { value: "SAS", label: "School of Advanced Studies (SAS)" },
  { value: "SAMCIS", label: "School of Accountancy, Management, Computing and Information Studies (SAMCIS)" },
  { value: "SEA", label: "School of Engineering and Architecture (SEA)" },
  { value: "SOL", label: "School of Law (SOL)" },
  { value: "SOM", label: "School of Medicine (SOM)" },
  { value: "SOHNABS", label: "School of Nursing, Allied Health, and Biological Sciences (SOHNABS)" },
  { value: "STELA", label: "School of Teacher Education and Liberal Arts (STELA)" }
];

const DEPARTMENT_OPTIONS = {
  SAS: ["Department of Social Sciences", "Department of Natural Sciences"],
  SAMCIS: ["Department of Accountancy", "Department of Management", "Department of Computing and Information Studies"],
  SEA: ["Department of Civil Engineering", "Department of Architecture"],
  SOL: ["Department of Law"],
  SOM: ["Department of Medicine"],
  SOHNABS: ["Department of Nursing", "Department of Allied Health", "Department of Biological Sciences"],
  STELA: ["Department of Teacher Education", "Department of Liberal Arts"]
};

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
  const [modalMessage, setModalMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatName = (name) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'firstname' || name === 'lastname') {
      newValue = newValue.replace(/^\s+/, '');
      newValue = newValue.replace(/[^a-zA-Z\s]/g, '');
      newValue = newValue.replace(/\s{2,}/g, ' ');

      newValue = newValue
        .split(' ')
        .map(word =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');

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
      const formatted = formatName(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
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
    setModalMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errors.firstname || errors.lastname || errors.email) {
      setModalMessage("Please correct the errors before submitting.");
      setIsSuccess(false);
      return;
    }

    if (!formData.role.name) {
      setModalMessage("Please select a role.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);
    setModalMessage(null);

    const data = new FormData();
    data.append('firstname', formData.firstname);
    data.append('lastname', formData.lastname);
    data.append('email', formData.email);
    data.append('school', formData.school);
    data.append('department', formData.role.department);
    data.append('role', JSON.stringify(formData.role));
    if (image) data.append('profile_picture', image);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8001/api/admin/create-user', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });
      const result = await res.json();
      setLoading(false);

      if (res.ok) {
        setIsSuccess(true);
        setModalMessage('User created successfully');
        handleClear();
      } else {
        setIsSuccess(false);
        setModalMessage(result.message || 'Failed to create user');
      }
    } catch (err) {
      setLoading(false);
      setIsSuccess(false);
      setModalMessage('Error: ' + err.message);
    }
  };

  const showSchool = ["Faculty", "Dean", "Secretary", "Document Controller", "Department Head"].includes(formData.role.name);
  const showDepartment = ["Faculty", "Document Controller", "Department Head"].includes(formData.role.name);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow-lg p-10">
            <h2 className="text-3xl font-bold text-black uppercase mb-4">Create New User</h2>
            <div className="w-20 h-1 bg-yellow-500 mb-8"></div>
            {modalMessage && (
              <div className={`p-4 mb-6 text-sm font-medium rounded-lg ${isSuccess ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                {modalMessage}
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
                    <button type="submit" className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800">Add User</button>
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
