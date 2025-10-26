import React, { useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import { StatusBadge, formatDate, formatDateTime } from "../../utils/formatters";

export default function FacultyWorkflowView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitTo, setSubmitTo] = useState({
    deptHead: true,
    secretary: false,
    dean: false
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: replace with actual data fetching logic
  const recipients = {
    deptHead: {
      name: "Janvin Malaluan",
      position: "Department Head",
      initials: "JM",
      role: "deptHead"
    },
    secretary: {
      name: "Nikola Jokic",
      position: "Secretary",
      initials: "NJ",
      role: "secretary"
    },
    dean: {
      name: "Luka Doncic",
      position: "Dean",
      initials: "LD",
      role: "dean"
    }
  };

  const doc = useMemo(
    () =>
      state?.doc || {
        id,
        code: "FM-QMS-2024",
        rev: "02",
        eff: new Date().toISOString(),
        title: "Document Title 1",
        createdBy: "Nichs Escano",
        ownedBy: "Owner Placeholder",
        due: new Date(Date.now() + 86400000).toISOString(),
        status: "Pending",
        points: "100 points",
        instructions: "Please review",
        updatedAt: new Date().toISOString()
      },
    [id, state]
  );

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorForRole = (role) => {
    const colors = {
      deptHead: "from-blue-500 to-blue-600",
      secretary: "from-purple-500 to-purple-600",
      dean: "from-amber-500 to-amber-600"
    };
    return colors[role] || "from-gray-500 to-gray-600";
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file to submit");
      return;
    }

    if (!submitTo.deptHead && !submitTo.secretary && !submitTo.dean) {
      alert("Please select at least one recipient");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const recipientsList = [];
      if (submitTo.deptHead) recipientsList.push(recipients.deptHead.name);
      if (submitTo.secretary) recipientsList.push(recipients.secretary.name);
      if (submitTo.dean) recipientsList.push(recipients.dean.name);

      const fileNames = selectedFiles.map(f => f.name).join(', ');

      alert(
        `Document submitted successfully!\n\nFiles: ${fileNames}\nTotal: ${selectedFiles.length} file(s)\nConverted to: PDF\nSubmitted to: ${recipientsList.join(", ")}\nMessage: ${message || "None"}`
      );
      setIsSubmitting(false);
      navigate(-1);
    }, 2000);
  };

  const getTotalSize = () => {
    const total = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    return formatFileSize(total);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          {/* Container */}
          <div className="w-full px-4 max-w-8xl">
            {/* Back Button */}
            <div className="mb-6 mt-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[#0035DA] hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                <span className="font-medium">Back</span>
              </button>
            </div>

            {/* Document Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Left Section - Document Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6 text-gray-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                      />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900">{doc.title}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-600 font-medium">
                      {doc.code} • Revision {doc.rev}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">
                      Assigned by <span className="font-medium">{doc.createdBy}</span>
                    </span>
                    <StatusBadge type={doc.status} />
                  </div>
                  
                  {doc.updatedAt && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last updated: {formatDateTime(doc.updatedAt)}
                    </div>
                  )}
                </div>

                {/* Right Section - Due Date */}
                <div className="text-right sm:ml-6">
                  <div className="text-2xl font-bold text-blue-600">{doc.points}</div>
                  <div className="text-sm font-semibold text-gray-500 mt-1">
                    Due: {formatDate(doc.due)}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions Section */}
            {doc.instructions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Instructions</h3>
                <p className="text-gray-700 leading-relaxed">
                  {doc.instructions}
                </p>
              </div>
            )}

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Submission Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upload Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Your Work
                  </h2>

                  {/* File Upload Area */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Documents
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".doc,.docx,.pdf,.txt"
                        multiple
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="w-12 h-12 text-gray-400 mb-3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          Click to upload
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          DOC, DOCX, or TXT (will be converted to PDF)
                        </span>
                      </label>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Selected Files ({selectedFiles.length})
                          </span>
                          <span className="text-xs text-gray-500">
                            Total: {getTotalSize()}
                          </span>
                        </div>
                        
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="w-8 h-8 text-blue-600 flex-shrink-0"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                />
                              </svg>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(file.size)} • Ready for PDF conversion
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="ml-3 text-gray-400 hover:text-red-600 flex-shrink-0"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add a comment (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add any notes or comments for the reviewers..."
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedFiles.length === 0}
                    className={`px-6 py-3 rounded-lg font-medium transition ${
                      isSubmitting || selectedFiles.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      "Submit Work"
                    )}
                  </button>
                </div>
              </div>

              {/* Submit To Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Submit To
                  </h2>

                  <div className="space-y-4">
                    {/* Department Head */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={submitTo.deptHead}
                        onChange={(e) =>
                          setSubmitTo({ ...submitTo, deptHead: e.target.checked })
                        }
                        className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 bg-gradient-to-br ${getColorForRole(recipients.deptHead.role)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                            {recipients.deptHead.initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600">
                              {recipients.deptHead.name}
                            </div>
                            <div className="text-xs text-gray-500">{recipients.deptHead.position} • Required</div>
                          </div>
                        </div>
                      </div>
                    </label>

                    <div className="border-t border-gray-200"></div>

                    {/* Secretary */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={submitTo.secretary}
                        onChange={(e) =>
                          setSubmitTo({ ...submitTo, secretary: e.target.checked })
                        }
                        className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 bg-gradient-to-br ${getColorForRole(recipients.secretary.role)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                            {recipients.secretary.initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600">
                              {recipients.secretary.name}
                            </div>
                            <div className="text-xs text-gray-500">{recipients.secretary.position} • Optional</div>
                          </div>
                        </div>
                      </div>
                    </label>

                    <div className="border-t border-gray-200"></div>

                    {/* Dean */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={submitTo.dean}
                        onChange={(e) =>
                          setSubmitTo({ ...submitTo, dean: e.target.checked })
                        }
                        className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 bg-gradient-to-br ${getColorForRole(recipients.dean.role)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                            {recipients.dean.initials}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-blue-600">
                              {recipients.dean.name}
                            </div>
                            <div className="text-xs text-gray-500">{recipients.dean.position} • Optional</div>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      Selected Recipients
                    </div>
                    <div className="text-sm text-gray-900">
                      {[
                        submitTo.deptHead && recipients.deptHead.name,
                        submitTo.secretary && recipients.secretary.name,
                        submitTo.dean && recipients.dean.name,
                      ]
                        .filter(Boolean)
                        .join(", ") || "None selected"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}