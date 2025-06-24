import React, { useState } from "react";
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';

const ROLE_OPTIONS = [
  "Admin",
  "Faculty",
  "Dean",
  "Department Head",
  "Secretary",
  "Document Controller"
];
// schools of SLU
const SCHOOL_OPTIONS = [
  { value: "SAS", label: "School of Advanced Studies (SAS)" },
  { value: "SAMCIS", label: "School of Accountancy, Management, Computing and Information Studies (SAMCIS)" },
  { value: "SEA", label: "School of Engineering and Architecture (SEA)" },
  { value: "SOL", label: "School of Law (SOL)" },
  { value: "SOM", label: "School of Medicine (SOM)" },
  { value: "SOHNABS", label: "School of Nursing, Allied Health, and Biological Sciences (SOHNABS)" },
  { value: "STELA", label: "School of Teacher Education and Liberal Arts (STELA)" }
];
//  department options based on school selection
// NOTE: To be updated with actual departments
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
  const [image, setImage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "school") {
      setFormData({ ...formData, [name]: value, department: "" });
    } else {
      setFormData({ ...formData, [name]: value });
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
      role: {
        name: '',
        school: '',
        department: ''
      }
    });
    setImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    if (image) {
      data.append('profile_picture', image);
    }
    console.log('Form Data:', formData);
    console.log('Image:', image);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8001/api/admin/create-user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: data
      });
      const result = await res.json();

      if (res.ok) {
        // add modal
        alert('User created successfully');
        handleClear();
      } else {
        alert(result.message || 'Failed to create user');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const showSchool = ["Faculty", "Dean", "Secretary", "Document Controller", "Department Head"].includes(formData.role);
  const showDepartment = ["Faculty", "Document Controller", "Department Head"].includes(formData.role);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow-lg p-10">
            <h2 className="text-3xl font-bold text-black uppercase mb-4">Create New User</h2>
            <div className="w-20 h-1 bg-yellow-500 mb-8"></div>

            <div className="flex flex-col lg:flex-row items-start gap-10">
              {/* Avatar Section */}
              <div className="flex justify-center w-full lg:w-1/3">
                <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center relative group">
                  <label htmlFor="profile_picture" className="w-full h-full flex items-center justify-center cursor-pointer">
                    {image ? (
                      <img
                        src={URL.createObjectURL(image)}
                        alt="Preview"
                        className="w-48 h-48 object-cover rounded-full"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A12.083 12.083 0 0112 15c2.137 0 4.138.56 5.879 1.54M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <input
                      id="profile_picture"
                      name="profile_picture"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                   
                  </label>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="w-full lg:w-2/3 space-y-8" encType="multipart/form-data">
                {/* Personal Information */}
                <div>
                  <h3 className="text-blue-900 font-bold text-lg mb-2">Personal Information:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstname" className="block font-medium text-sm">First Name</label>
                      <input id="firstname" name="firstname" type="text" value={formData.firstname} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label htmlFor="lastname" className="block font-medium text-sm">Last Name</label>
                      <input id="lastname" name="lastname" type="text" value={formData.lastname} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block font-medium text-sm">Email</label>
                      <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>

                   
                    {/* School Dropdown */}
                    {showSchool && (
                      <div className="relative">
                        <label htmlFor="school" className="block font-medium text-sm mb-1">School</label>
                        <select
                          id="school"
                          name="school"
                          value={formData.role.school}
                          onChange={handleChange}
                          className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select School</option>
                          {SCHOOL_OPTIONS.map(school => (
                            <option key={school.value} value={school.value}>{school.label}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute top-9 right-3 text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Department & Role */}
                <div>
                  <h3 className="text-blue-900 font-bold text-lg mb-2">Department & Role:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Department Dropdown */}
                    {showDepartment && (
                      <div className="relative">
                        <label htmlFor="department" className="block font-medium text-sm mb-1">Department</label>
                        <select
                          id="department"
                          name="department"
                          value={formData.role.department}
                          onChange={handleChange}
                          className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                         // disabled={!formData.school}
                        >
                          <option value="">Select Department</option>
                          {(DEPARTMENT_OPTIONS[formData.school] || []).map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute top-9 right-3 text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Role Dropdown */}
                    <div className="relative">
                      <label htmlFor="role" className="block font-medium text-sm mb-1">Role</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role.name}
                        onChange={handleChange}
                        className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Role</option>
                        {ROLE_OPTIONS.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute top-9 right-3 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                  <button type="button" onClick={handleClear} className="px-6 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">Clear</button>
                  <button type="submit" className="px-6 py-2 bg-blue-700 text-white rounded hover:bg-blue-800">Add User</button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
