import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import { StatusBadge } from "../../utils/formatters";
import Greeting from "../../components/greeting";
import { Doughnut } from "react-chartjs-2";
import { getDeanSecDashboardAPI } from "../../api/documentsAPI";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function SecretaryDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  const SUBMISSION_BINS_ROUTE = "/submission-bins";
  const DOC_CONTROLLER_TEMPLATES_ROUTE = "/templates?status=Published";

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

  // default live template data from API (start empty; only use API-provided lists)
  const [templatesData, setTemplatesData] = useState([]);
  const [publishedTemplatesData, setPublishedTemplatesData] = useState([]);

  const templateColumns = [
    { key: "title", label: "Title" },
    // 'Submitted At' column removed per request
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
            navigate(`/templates/${id}`, {
              state: { doc: row, origin: "dean:recently-submitted" },
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
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const id = row._id ?? row.id ?? row.templateId;
            navigate(`/templates/published/${id}`, {
              state: { doc: row, origin: "dean:recently-published" },
            });
          }}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  // Dean/Sec live data
  const [latestForwarded, setLatestForwarded] = useState([]);
  const [forwardedByDepartment, setForwardedByDepartment] = useState([]);
  const [totalForwardedCount, setTotalForwardedCount] = useState(0);
  const [loadingDean, setLoadingDean] = useState(true);
  const [errorDean, setErrorDean] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingDean(true);
      try {
        const res = await getDeanSecDashboardAPI();
        console.log(res);
        if (!mounted) return;
        setForwardedByDepartment(res.forwardedByDepartment || []);
        setTotalForwardedCount(res.totalForwardedCount || 0);
        // set templates data if analytics returned them (keep placeholders otherwise)
        setTemplatesData((res.templates || []).slice(0, 5));
        setPublishedTemplatesData((res.publishedTemplates || []).slice(0, 5));
        setLatestForwarded((res.latestForwarded || []).slice(0, 5));
        setErrorDean(null);
      } catch (e) {
        console.error("Failed to load dean/sec dashboard", e);
        if (!mounted) return;
        setErrorDean(e.message || "Failed to load dean dashboard");
      } finally {
        if (mounted) setLoadingDean(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Do not show placeholder/fake bins — default to an empty array so the
  // UI will render the empty-state message when there are no forwarded bins.
  const forwardedSubmissionBinsData = (latestForwarded && latestForwarded.length)
    ? latestForwarded.map((b) => ({
      id: b.id,
      title: b.title,
      department: b.department,
      submission: b.submissionsCount,
    }))
    : [];

  const forwardedSubmissionBinsColumns = [
    { key: "title", label: "Title" },
    { key: "department", label: "Department" },
    { key: "submission", label: "No. of Submissions" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const id = row._id ?? row.id ?? row.templateId;
            navigate(`/templates/published/${id}`, {
              state: { doc: row, origin: "dean:recently-forwarded" },
            });
          }}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  const defaultColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];
  const chartData = {
    labels:
      forwardedByDepartment && forwardedByDepartment.length
        ? forwardedByDepartment.map((d) => d.department)
        : ["Computing and Information Studies", "Management", "Accountancy"],
    datasets: [
      {
        data:
          forwardedByDepartment && forwardedByDepartment.length
            ? forwardedByDepartment.map((d) => d.count)
            : [56, 36, 5],
        backgroundColor:
          forwardedByDepartment && forwardedByDepartment.length
            ? forwardedByDepartment.map((_, i) => defaultColors[i % defaultColors.length])
            : ["#3B82F6", "#10B981", "#F59E0B"],
        borderWidth: 0,
        cutout: "60%",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />

      <div className="flex flex-col lg:flex-row flex-1">
        <Sidebar user={user} active="Dashboard" />

        {/* Main content panel */}
        <main
          className="
          flex-1 flex flex-col bg-white
          lg:shadow
          pt-1 pb-4
          px-4 sm:px-6 lg:px-8
          mx-0 lg:mx-6
          mt-4 lg:mt-8
          rounded-none lg:rounded-xl
          w-full max-w-full
        "
        >
          <Greeting name={user?.firstname || "Department Head"} />

          {/* Stat cards */}
          <div className="flex flex-wrap gap-4 items-stretch mb-3 mt-4"></div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
            {/* Left side: tables */}
            <div className="lg:col-span-3 space-y-6">
              {/* Templates Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      RECENTLY SUBMITTED TEMPLATES
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 rounded" />
                  </div>

                  {/* Goes to DOC_CONTROLLER_TEMPLATES_ROUTE */}
                  <button
                    onClick={() => navigate("/templates")}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div className="h-64 overflow-hidden">
                    <Table
                      columns={templateColumns}
                      data={templatesData}
                      fillHeight
                      emptyMessage="No recently submitted templates."
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* Right side: deadlines + chart */}
            <div className="lg:col-span-1 space-y-6">
              {/* Deadlines Summary Doughnut Chart */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100">
                <div className="bg-[#FBFBFB] px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">
                    SUBMISSION OVERVIEW — Last 30 Days
                  </h3>
                </div>

                <div className="p-6">
                  {/* chart container */}
                  {forwardedByDepartment && forwardedByDepartment.length > 0 ? (
                    <>
                      <div className="relative h-50 mb-4">
                        <Doughnut data={chartData} options={chartOptions} />
                      </div>

                      <div className="space-y-3">
                        {forwardedByDepartment.map((d, i) => (
                          <div key={d.department || i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full`}
                                style={{ backgroundColor: defaultColors[i % defaultColors.length] }}
                              ></div>
                              <span className="text-gray-600">{d.department}</span>
                            </div>
                            <span className="font-medium text-gray-800">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-36 text-sm text-gray-500">No submission overview data available for your school.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recently Forwarded Submission Bins */}
          <div className="bg-[#FBFBFB] shadow p-4 rounded w-full mt-6">
            <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
              <div>
                <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                  RECENTLY FORWARDED SUBMISSION BINS
                </h2>
                <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
              </div>

              {/* Goes to SUBMISSION_BINS_ROUTE */}
              <button
                onClick={() => navigate(SUBMISSION_BINS_ROUTE)}
                className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="h-64 overflow-hidden">
                <Table
                  columns={forwardedSubmissionBinsColumns}
                  data={forwardedSubmissionBinsData}
                  fillHeight
                  emptyMessage="No recently forwarded submission bins for your school."
                />
              </div>
            </div>
          </div>

          {/* Recently Published Table */}
          <div className="bg-[#FBFBFB] shadow p-4 rounded w-full mt-6">
            <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
              <div>
                <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                  RECENTLY PUBLISHED TEMPLATES
                </h2>
                <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
              </div>

              <button
                onClick={() => navigate(DOC_CONTROLLER_TEMPLATES_ROUTE)}
                className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="h-64 overflow-hidden">
                <Table
                  columns={publishedTemplatesColumns}
                  data={publishedTemplatesData}
                  fillHeight
                  emptyMessage="No recently published templates available."
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}