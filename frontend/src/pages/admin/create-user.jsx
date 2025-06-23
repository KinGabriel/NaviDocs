import React, { useState } from "react";
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';

export default function CreateUser() {
  const user = useUser();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    school: '',
    year: '',
    department: '',
    role: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClear = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      school: '',
      year: '',
      department: '',
      role: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('User Added:', formData);
    // Add logic to send data to backend
  };

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
                <div className="w-48 h-48 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A12.083 12.083 0 0112 15c2.137 0 4.138.56 5.879 1.54M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleSubmit} className="w-full lg:w-2/3 space-y-8">
                {/* Personal Information */}
                <div>
                  <h3 className="text-blue-900 font-bold text-lg mb-2">Personal Information:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block font-medium text-sm">First Name</label>
                      <input id="firstName" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block font-medium text-sm">Last Name</label>
                      <input id="lastName" name="lastName" type="text" value={formData.lastName} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                    <div>
                      <label htmlFor="email" className="block font-medium text-sm">Email</label>
                      <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full p-2 border border-gray-300 rounded" />
                    </div>

                    {/* School Dropdown */}
                    <div className="relative">
                      <label htmlFor="school" className="block font-medium text-sm mb-1">School</label>
                      <select
                        id="school"
                        name="school"
                        value={formData.school}
                        onChange={handleChange}
                        className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select School</option>
                      </select>
                      <div className="pointer-events-none absolute top-9 right-3 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="year" className="block font-medium text-sm">Year</label>
                      <input id="year" name="year" type="text" value={formData.year} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded" />
                    </div>
                  </div>
                </div>

                {/* Department & Role */}
                <div>
                  <h3 className="text-blue-900 font-bold text-lg mb-2">Department & Role:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                    {/* Department Dropdown */}
                    <div className="relative">
                      <label htmlFor="department" className="block font-medium text-sm mb-1">Department</label>
                      <select
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Department</option>
                      </select>
                      <div className="pointer-events-none absolute top-9 right-3 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Role Dropdown */}
                    <div className="relative">
                      <label htmlFor="role" className="block font-medium text-sm mb-1">Role</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full p-2 pr-10 border border-gray-300 rounded appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Role</option>
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
