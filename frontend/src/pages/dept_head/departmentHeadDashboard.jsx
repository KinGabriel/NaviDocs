import React, { useState, useEffect } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../utils/formatters";
import { getDeptHeadDashboardAPI } from "../../api/documentsAPI";
import Loader from "../../components/loader";

export default function DepartmentHeadDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Data loaded from API
  const [templates, setTemplates] = useState([]);
  const [publishedTemplates, setPublishedTemplates] = useState([]);
  const [submissionOverviewData, setSubmissionOverviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const templateColumns = [
    { key: "title", label: "Title" },
    { key: "createdBy", label: "Created By" },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge type={row.status} />,
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const id = row._id ?? row.id ?? row.templateId;
            navigate(`/templates/published/${id}`, {
              state: { doc: row, origin: "deptHead:recently-submitted" },
            });
          }}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  const publishedTemplatesColumns = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "date", label: "Effectivity", render: (row) => formatDate(row.date) },
    { key: "title", label: "Title", render: (row) => <span className="truncate block max-w-xs">{row.title}</span> },
    { key: "createdBy", label: "Created By" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const id = row._id ?? row.id ?? row.templateId;
            navigate(`/templates/published/${id}`, {
              state: { doc: row, origin: "deptHead:recently-published" },
            });
          }}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  // upcoming/dueToday/overdue will be loaded from API
  const [upcomingDeadlinesData, setUpcomingDeadlinesData] = useState([]);
  const [dueTodayData, setDueTodayData] = useState([]);
  const [overdueData, setOverdueData] = useState([]);

  // submissionOverviewData is controlled by state

  const submissionOverviewColumns = [
    { key: "name", label: "Submission Name" },
    { key: "totalDocs", label: "Total Docs" },
    { key: "onTime", label: "Submitted (On-Time)" },
    { key: "late", label: "Submitted (Late)" },
    { key: "pendingNotPassed", label: "Pending" },
    { key: "completion", label: "Completion %" },
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDeptHeadDashboardAPI();
        if (!mounted) return;
        setTemplates(res.templates || []);
        setPublishedTemplates(res.publishedTemplates || []);
        setSubmissionOverviewData(res.bins || []);
        setUpcomingDeadlinesData(res.upcoming || []);
        setDueTodayData(res.dueToday || []);
        setOverdueData(res.overdue || []);
      } catch (e) {
        console.error('Failed to load dept head dashboard', e);
        if (mounted) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);


  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        <main className="flex-1 flex flex-col bg-white lg:shadow pt-1 pb-4 px-4 sm:px-6 lg:px-8 mx-0 lg:mx-6 mt-4 lg:mt-8 rounded-none lg:rounded-xl w-full max-w-full">
          <Greeting name={user?.firstname || "Document Controller"} />
          {loading ? (
            <div className="flex-1 flex justify-center items-center min-h-[60vh]">
              <Loader message="Loading dashboard..." />
            </div>
          ) : error ? (
            <div className="flex-1 flex justify-center items-center min-h-[60vh] text-red-500">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Error loading dashboard</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="flex flex-wrap gap-4 items-stretch mb-8 mt-4">
                {/* Upcoming Deadlines */}
                <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
                  <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                    <CalendarClock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Upcoming Deadlines</div>
                    <div className="text-3xl font-bold text-gray-900">{upcomingDeadlinesData.length}</div>
                  </div>
                </div>

                {/* Due Today */}
                <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <CalendarCheck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Due Today</div>
                    <div className="text-3xl font-bold text-gray-900">{dueTodayData.length}</div>
                  </div>
                </div>

                {/* Overdue Deadlines */}
                <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <CalendarX className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600 mb-1">Overdue Deadlines</div>
                    <div className="text-3xl font-bold text-gray-900">{overdueData.length}</div>
                  </div>
                </div>
              </div>

              {/* Tables and Upcoming Deadlines */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                    <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                      <div>
                        <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                          RECENTLY SUBMITTED TEMPLATES
                        </h2>
                        <div className="w-16 h-1 bg-yellow-400 mt-1 rounded" />
                      </div>

                      <button
                        onClick={() => navigate("/document-workflow")}
                        className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                      >
                        View All
                      </button>
                    </div>

                    <div className="mt-4 h-64 overflow-hidden">
                      <div className="h-full overflow-x-auto">
                        <Table columns={templateColumns} data={templates} fillHeight />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                  {/* combine all categories into a single list the component can filter by priority */}
                  {(() => {
                    const allDeadlines = [
                      ...(upcomingDeadlinesData || []),
                      ...(dueTodayData || []),
                      ...(overdueData || []),
                    ];
                    // ensure each item has a priority field and a date field the component expects
                    const normalized = allDeadlines.map(d => ({
                      id: d.id || d._id || null,
                      title: d.title || d.title,
                      date: d.date || d.deadline || d.createdAt || null,
                      priority: d.priority || (d.completion ? 'Upcoming' : 'Upcoming'),
                      department: d.department || ''
                    }));

                    return (
                      <UpcomingDeadlines
                        deadlines={normalized}
                        formatDate={formatDate}
                      />
                    );
                  })()}
                </div>

                {/* Submission Overview */}
                <div className="lg:col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
                  <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                    <div>
                      <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                        SUBMISSION OVERVIEW
                      </h2>
                      <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                    </div>
                  </div>

                  <div className="mt-2 h-64 overflow-hidden">
                    <div className="h-full overflow-x-auto">
                      <Table
                        columns={submissionOverviewColumns}
                        data={submissionOverviewData}
                        fillHeight
                      />
                    </div>
                  </div>
                </div>

                {/* Recently Published */}
                <div className="lg:col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
                  <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                    <div>
                      <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                        RECENTLY PUBLISHED TEMPLATES
                      </h2>
                      <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                    </div>

                    <button
                      onClick={() => navigate("/templates", { state: { status: "Published" } })}
                      className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                    >
                      View All
                    </button>
                  </div>

                  <div className="mt-2 h-64 overflow-hidden">
                    <div className="h-full overflow-x-auto">
                      <Table
                        columns={publishedTemplatesColumns}
                        data={publishedTemplates}
                        fillHeight
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}