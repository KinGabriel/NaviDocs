// Section Header for the sectioning of editable fields
import React from "react";

export default function SectionHeader({ number, title, subtitle, color = "bg-blue-500" }) {
  return (
    <div className="flex items-start mb-4">
      <div
        className={`w-6 h-6 ${color} text-white flex items-center justify-center rounded-sm mr-2 text-sm font-bold`}
      >
        {number}
      </div>
      <div>
        <h3 className="font-medium ">{title}</h3>
        {subtitle && <span className="text-gray-400 text-sm ">{subtitle}</span>}
      </div>
    </div>
  );
}
