import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import { StatusBadge, formatDate, formatDateTime } from "../utils/formatters";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  MoreVertical,
} from "lucide-react";
  
// Dummy data for submissions - FOR DEMO PURPOSES ONLY
const MOCK_SUBMISSIONS = Array.from({ length: 15 }, (_, i) => {
  const createdDate = new Date('2025-10-01');
  createdDate.setDate(createdDate.getDate() + i * 2);
  
  const deadlineDate = new Date('2025-11-15');
  deadlineDate.setDate(deadlineDate.getDate() + (i * 3) - 15);
  
  let status;
  const now = new Date();
  const daysUntilDue = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  
  if (i % 5 === 0) {
    status = "draft";
  } else if (daysUntilDue < 0) {
    status = "overdue";
  } else if (i % 7 === 0) {
    status = "completed";
  } else {
    status = "active";
  }
  
  const numSubmissions = 3 + (i % 5);
  const submissions = Array.from({ length: numSubmissions }, (_, j) => {
    const names = ["John Doe", "Ana Reyes", "Carlos Mendoza", "Joshua Garcia", "Maria Santos", "Gigi Gonzales"];
    
    let itemStatus;
    if (j < Math.floor(numSubmissions * 0.6)) {
      itemStatus = "submitted";
    } else if (daysUntilDue < 0) {
      itemStatus = "late";
    } else {
      itemStatus = "pending";
    }
    
    const submittedDate = itemStatus === "submitted" 
      ? new Date(createdDate.getTime() + (j + 1) * 86400000 * 2) 
      : null;
    
    return {
      id: j + 1,
      documentName: `Document Title ${j + 1}`,
      submittedBy: names[j % names.length],
      submittedAt: submittedDate ? submittedDate.toISOString() : null,
      files: itemStatus === "submitted" ? [`Report-Q${j + 1}.pdf`] : [],
      status: itemStatus,
    };
  });
  
  return {
    id: i + 1,
    title: `Submission Bin Title ${i + 1}`,
    instructions: `Please review and provide feedback on the attached documents for submission ${i + 1}. Ensure all requirements are met before the deadline.`,
    createdAt: createdDate.toISOString(),
    deadline: deadlineDate.toISOString(),
    status: status,
    submission: submissions,
  };
});


export default function SubmissionDetails() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const handleViewSubmission = (submissionId) => {
  navigate(`/submissions/${submissionId}`);
  };

  // Find the submission by ID from the URL parameter
  const submission = MOCK_SUBMISSIONS.find(s => s.id === parseInt(id));

  // If submission not found, show error state
  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h2>
            <p className="text-gray-600 mb-6">The submission you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = useMemo(() => {
    const total = submission.submission.length;
    const submitted = submission.submission.filter((u) => u.status === "submitted").length;
    const pending = submission.submission.filter((u) => u.status === "pending").length;
    const late = submission.submission.filter((u) => u.status === "late").length;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, pending, late, percentage };
  }, [submission]);

  const daysUntilDue = Math.ceil((new Date(submission.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;

  const handleBack = () => navigate(-1);

 return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 gap-2 text-[#0035DA] hover:bg-blue-50 rounded-lg mb-6 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {submission.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          Created
                          <span>{formatDate(submission.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge type={submission.status} />
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical size={20} className="text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Instructions and Deadline - Same Width */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Instructions */}
                {submission.instructions && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
                    <p className="text-sm text-gray-600">{submission.instructions}</p>
                  </div>
                )}

                {/* Deadline Banner */}
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    isOverdue
                      ? "bg-red-50 border border-red-200"
                      : daysUntilDue <= 3
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <Calendar
                    size={20}
                    className={
                      isOverdue
                        ? "text-red-600"
                        : daysUntilDue <= 3
                        ? "text-orange-600"
                        : "text-blue-600"
                    }
                  />
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isOverdue
                          ? "text-red-900"
                          : daysUntilDue <= 3
                          ? "text-orange-900"
                          : "text-blue-900"
                      }`}
                    >
                      Due {formatDateTime(submission.deadline)}
                    </p>
                    <p
                      className={`text-sm ${
                        isOverdue
                          ? "text-red-700"
                          : daysUntilDue <= 3
                          ? "text-orange-700"
                          : "text-blue-700"
                      }`}
                    >
                      {isOverdue
                        ? `Overdue by ${Math.abs(daysUntilDue)} day${
                            Math.abs(daysUntilDue) !== 1 ? "s" : ""
                          }`
                        : `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard label="Total Assigned" value={stats.total} icon={Users} color="blue" />
              <StatsCard label="Submitted" value={stats.submitted} icon={CheckCircle} color="green" />
              <StatsCard label="Pending" value={stats.pending} icon={Clock} color="orange" />
              <StatsCard label="Late/Missing" value={stats.late} icon={AlertCircle} color="red" />
            </div>

            {/* Submitted Documents/File Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Submitted Files</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Document Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Submitted On
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submission.submission.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.documentName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.submittedBy}</td>
                        <td className="px-6 py-4">
                          <StatusBadge type={item.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.submittedAt ? formatDateTime(item.submittedAt) : "-"}
                        </td>
                        <td className="px-6 py-4">
                          {item.status === "submitted" ? (
                             <button
                            className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                            onClick={() => handleViewSubmission(submission.id)}
                              >
                            View
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}