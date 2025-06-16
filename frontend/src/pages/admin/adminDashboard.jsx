import React from 'react';
import useUser from '../../hooks/useUser';
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar'; 
import Greeting from '../../components/greeting';
import StatCard from '../../components/statcard';
import Table from '../../components/table';

export default function AdminDashboard() {
  const user = useUser();

  // for visualization only (TO CHANGE)
  const stats = [
    { title: 'School Dean', value: 4 },
    { title: 'Department Head', value: 6 },
    { title: 'Faculty Members', value: 206 },
    { title: 'Students', value: '12,546' },
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
        <main className="p-6 flex-1 overflow-y-auto">
          <Greeting name={user?.name || 'Admin'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat) => (
              <StatCard key={stat.title} title={stat.title} value={stat.value} />
            ))}
          </div>

          {/* table */}
          <div className="mt-10">
            <Table columns={columns} data={data} />
          </div>
        </main>
      </div>
    </div>
  );
}
