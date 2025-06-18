import React from 'react';
import useUser from '../../hooks/useUser';
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar'; 
import Greeting from '../../components/greeting';
import StatCard from '../../components/statcard';
import Table from '../../components/table';
import Loader from '../../components/loader';

export default function AdminDashboard() {
  const user = useUser();

   const isLoading = false; // simulating loading state, replace with actual loading logic

  // for visualization only (TO CHANGE)
  const stats = [
    { title: 'School Dean', value: 4 },
    { title: 'Department Head', value: 6 },
    { title: 'Faculty Members', value: 206 },
    { title: 'Total Users', value: '12,546' },
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'schoolemail', label: 'School Email' },
    { key: 'department', label: 'Department' },
    { key: 'school', label: 'School' },
    { key: 'role', label: 'Role' },
  ];

  const data = [
    {
      name: 'John Doe',
      schoolemail: 'john.doe@slu.edu.ph',
      department: 'Computer Science',
      school: 'School of Computing and Information Sciences',
      role: 'Dean',
    },
    {
      name: 'Jane Smith',
      schoolemail: 'jane.smith@slu.edu.ph',
      department: 'Information Technology',
      school: 'School of Computing and Information Sciences',
      role: 'Faculty',
    },
    {
      name: 'Michael Reyes',
      schoolemail: 'michael.reyes@slu.edu.ph',
      department: 'Engineering',
      school: 'School of Engineering and Architecture',
      role: 'Department Head',
    },
    {
      name: 'Angela Tan',
      schoolemail: 'angela.tan@slu.edu.ph',
      department: 'Business Administration',
      school: 'School of Business Management',
      role: 'Faculty',
    },
    {
      name: 'Carlos Mendoza',
      schoolemail: 'carlos.mendoza@slu.edu.ph',
      department: 'Education',
      school: 'School of Teacher Education and Liberal Arts',
      role: 'Dean',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      {/* sidebar & content area */}
      <div className="flex flex-1">
        <Sidebar user={user} />
         <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
        <main className="p-8 flex-1 overflow-y-auto">
          <Greeting name={user?.name || 'Admin'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat) => (
              <StatCard key={stat.title} title={stat.title} value={stat.value} />
            ))}
          </div>

      {/* table */}
          <div className="mt-10 bg-[#f7faff] rounded-t-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase">
                Recently Added Users
              </h2>
              <div className="w-30 h-0.5 bg-yellow-400 mt-1 rounded" />
            </div>
            <button className="bg-[#003DA5] text-white text-sm px-4 py-2 h-9 w-30 rounded-md hover:bg-[#002B7F]">
              View All
            </button>
          </div>
        </div>
          <div className="-mt-2">
            {isLoading ? (
              <Loader message="Loading..." />
            ) : (
              <Table columns={columns} data={data} />
            )}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
