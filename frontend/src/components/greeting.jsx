import React from 'react';

export default function Greeting({ name }) {
  return (
    <div className="px-1 pt-2">
      <h2 className="text-4xl font-bold text-[#003DA5]">
        Welcome back, {name}!
      </h2>
      <p className="text-m text-gray-500">Dashboard Overview</p>
    </div>
  );
}
