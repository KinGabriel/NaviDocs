import React, { useState } from "react";
import { ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import Panel from "../layout/editable_fields/panel";

export default function EditableFields() {
  const user = useUser();
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});

  // dummy config for panels and fields - change as needed depending on the required editable fields 
  const panelsConfig = [
    {
      number: 1,
      title: "Hello World",
      subtitle: "Basic course details and identifiers",
      color: "bg-blue-500",
      fields: [
        { type: "input", name: "courseName", label: "Course Name", placeholder: "Enter course name" },
        { type: "input", name: "courseNumber", label: "Course Number", placeholder: "Enter course number" },
        { type: "input", name: "semesterOffered", label: "Semester and Year Offered", placeholder: "e.g., 3rd Year 1st Semester" },
      ],
    },
    {
      number: 2,
      title: "Institution",
      subtitle: "Institution details and programs",
      color: "bg-green-500",
      fields: [
        { type: "input", name: "institution", label: "Institution", placeholder: "Enter institution name" },
        { type: "input", name: "schoolDepartment", label: "School/Department", placeholder: "Enter school/department" },
        { type: "input", name: "program", label: "Program", placeholder: "Enter program" },
      ],
    },
    {
      number: 3,
      title: "Course Requirements & Description",
      subtitle: "Prerequisites, co-requisites, and course overview",
      color: "bg-purple-500",
      fields: [
        { type: "textarea", name: "prerequisites", label: "Pre-requisites", placeholder: "Enter prerequisites" },
        { type: "textarea", name: "corequisites", label: "Co-requisites", placeholder: "Enter corequisites" },
        { type: "textarea", name: "courseDescription", label: "Course Description", placeholder: "Enter course description" },
      ],
    },
  ];

  const sectionsPerPage = 2;
  const totalPages = Math.ceil(panelsConfig.length / sectionsPerPage);
  const currentPanels = panelsConfig.slice(
    currentPage * sectionsPerPage,
    (currentPage + 1) * sectionsPerPage
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Progress Navigation
  const ProgressNavigation = ({ panelsConfig, currentPage }) => {
    const currentPanels = panelsConfig.slice(currentPage * 2, (currentPage + 1) * 2);
    return (
      <div className="bg-white p-4 border-gray-200 border-b">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Current:</span>
          {currentPanels.map((panel, index) => (
            <div key={panel.number} className="flex items-center">
              <div className={`w-6 h-6 ${panel.color} rounded-full flex items-center justify-center text-white font-medium text-xs`}>
                {panel.number}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">{panel.title}</span>
              {index < currentPanels.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 ml-3" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <EditableFieldsHeader user={user} />

      {/* Progress Navigation */}
      <ProgressNavigation panelsConfig={panelsConfig} currentPage={currentPage} />
      <div className="flex flex-1">
        <div className="w-1/2 bg-gray-50 p-6 space-y-6">
          {/* Render current panels */}
          {currentPanels.map((panel, idx) => (
            <Panel
              key={idx}
              number={panel.number}
              title={panel.title}
              subtitle={panel.subtitle}
              color={panel.color}
              fields={panel.fields}
              formData={formData}
              onChange={handleInputChange}
            />
          ))}

          {/* Dot slider */}
          <div className="flex items-center justify-center space-x-2 pt-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentPage
                    ? "bg-[#003DA5] scale-125"
                    : "bg-gray-300 hover:bg-gray-400 hover:scale-110"
                }`}
              />
            ))}
          </div>

       {/* Action Buttons */}
          <div className="flex justify-end items-center pt-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all form data? This action cannot be undone.")) {
                    setFormData({});
                  }
                }}
                disabled={Object.keys(formData).length === 0}
                className={`
                  inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                  ${Object.keys(formData).length > 0
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300" 
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  }
                `}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </button>

              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                  className="inline-flex items-center px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-[#003DA5] hover:text-[#003DA5] hover:shadow-md transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
              
              {currentPage < totalPages - 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
                  className="inline-flex items-center px-6 py-2.5 bg-[#003DA5] text-white rounded-lg font-medium text-sm hover:bg-[#052c6d] transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Text Editor Blank Document - Right Panel*/}
        <div className="w-1/2 bg-gray-50 p-6">
          <div className="bg-white rounded-lg shadow-sm h-full">
            {/* TextEditor */}



          </div>
        </div>
      </div>
    </div>
  );
}
