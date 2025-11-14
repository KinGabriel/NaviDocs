import React from 'react';

export default function StatCard({ title, value }) {
  return (
    <div className="bg-[#ECEEF6] shadow rounded-xl p-6 flex-1 min-w-[160px] text-center">
      <p className="text-m text-[#717171]">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}