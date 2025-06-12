import React from 'react';
import useUser from '../hooks/useUser';
import Header from '../layout/header'; 
import Sidebar from '../layout/sidebar'; 

export default function AdminDashboard() {
  const user = useUser();

  return (
    <div className="min-h-screen bg-gray-200">
      <Header user={user} />
      <Sidebar user={user} />
    </div>
  );
}
