import React, { useState, useEffect } from 'react';
import useUser from '../../hooks/useUser';
import Sidebar from '../../layout/sidebar';
import Header from '../../layout/header';   

export default function FacultyDashboard() {
  const user = useUser();

  return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} active="Dashboard" />
    </div>
    </div>
  );
};