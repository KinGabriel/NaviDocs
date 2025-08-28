import React, { useState } from "react";
import { Plus } from "lucide-react";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import SectionHeader from "../layout/editable_fields/sectionHeader";

export default function EditableFields() {
  const user = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    courseName: "",
    courseNumber: "",
    semesterOffered: "",
    institution: "",
    schoolDepartment: "",
    program: "",
    programs: [],
    courseDescription: "",
    prerequisites: "",
    corequisites: ""
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProgramChange = (index, value) => {
    const updatedPrograms = [...formData.programs];
    updatedPrograms[index] = value;
    setFormData(prev => ({
      ...prev,
      programs: updatedPrograms
    }));
  };

  const addProgram = () => {
    setFormData(prev => ({
      ...prev,
      programs: [...prev.programs, ""]
    }));
  };

  const removeProgram = (index) => {
    const updatedPrograms = formData.programs.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      programs: updatedPrograms
    }));
  };

  const nextStep = () => setCurrentStep(2);
  const prevStep = () => setCurrentStep(1);

  const handleClear = () => {
    setFormData({
      courseName: "",
      courseNumber: "",
      semesterOffered: "",
      institution: "",
      schoolDepartment: "",
      program: "",
      programs: [],
      courseDescription: "",
      prerequisites: "",
      corequisites: ""
    });
    setCurrentStep(1);
  };

  const handleSaveChanges = () => {
    console.log("Saving changes:", formData);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <EditableFieldsHeader user={user} />
      <div className="flex flex-1">
        <div className="w-1/2 bg-gray-50 p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
             {/* Course Information */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader
                  number={1}
                  title="Course Information"
                  subtitle="Basic course details and identifiers"
                  color="bg-blue-500"
                />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course Name</label>
                    <input
                      type="text"
                      value={formData.courseName}
                      onChange={(e) => handleInputChange("courseName", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter course name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Course Number</label>
                    <input
                      type="text"
                      value={formData.courseNumber}
                      onChange={(e) => handleInputChange("courseNumber", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="Enter course number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Semester and Year Offered</label>
                    <input
                      type="text"
                      value={formData.semesterOffered}
                      onChange={(e) => handleInputChange("semesterOffered", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                      placeholder="e.g., 3rd Year 1st Semester"
                    />
                  </div>
                </div>
              </div>

              {/* Institution Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader
                  number={2}
                  title="Institution"
                  subtitle="Institution details and programs"
                  color="bg-green-500"
                />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Institution</label>
                    <input
                      type="text"
                      value={formData.institution}
                      onChange={(e) => handleInputChange("institution", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                      placeholder="Enter institution name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">School/Department</label>
                    <input
                      type="text"
                      value={formData.schoolDepartment}
                      onChange={(e) => handleInputChange("schoolDepartment", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                      placeholder="Enter school/department"
                    />
                  </div>

                  {/* Program Section */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Program</label>
                    {/* Main program input field */}
                    <input
                      type="text"
                      value={formData.program}
                      onChange={(e) => handleInputChange("program", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50"
                      placeholder="Enter program"
                    />

                    {/* Additional program input fields */}
                    {formData.programs.map((program, index) => (
                      <div key={index} className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={program}
                          onChange={(e) => handleProgramChange(index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded bg-gray-50"
                          placeholder="Enter additional program"
                        />
                        <button
                          onClick={() => removeProgram(index)}
                          className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addProgram}
                      className="mt-2 px-3 py-2 w-full p-2 border border-gray-300 bg-gray-200 rounded hover:bg-gray-300 flex items-center gap-1 text-sm text-gray-700 justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another Program
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-6 mt-6">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Clear
                </button>
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-[#003DA5] hover:bg-[#052c6d] text-white rounded "
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Course Requirements Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <SectionHeader
                  number={3}
                  title="Course Requirements & Description"
                  subtitle="Perquisites, co-requisites, and course overview"
                  color="bg-[#6365FF]"
                />

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Pre-requisites</label>
                      <textarea
                        value={formData.prerequisites}
                        onChange={(e) => handleInputChange("prerequisites", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded h-20 resize-none"
                        placeholder="Enter prerequisites"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Co-requisites</label>
                      <textarea
                        value={formData.corequisites}
                        onChange={(e) => handleInputChange("corequisites", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded h-20 resize-none"
                        placeholder="Enter corequisites"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Course Description</label>
                    <textarea
                      value={formData.courseDescription}
                      onChange={(e) => handleInputChange("courseDescription", e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded h-32 resize-none"
                      placeholder="Enter course description"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-6 mt-6">
                  <button
                    onClick={prevStep}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-[#003DA5] text-white rounded hover:bg-[#052c6d]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
   
   {/* Text Editor Blank Paper Area - Right Panel*/}
        <div className="w-1/2 bg-gray-50 p-6">
          <div className="bg-white rounded-lg shadow-sm h-full">
            {/* Text Editor Blank Paper Area */}
          </div>
        </div>
      </div>
    </div>
  );
}