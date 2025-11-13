import React, { useState, useEffect } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import { CalendarClock, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../utils/formatters";
import { fetchDashboardInfoAPI } from "../../api/documentContollerAPI";
import Loader from "../../components/loader";


export default function DocumentControllerDashboard() {
  const user = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


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


  // Recently submitted templates (will be fetched from dashboard)
  const [templates, setTemplates] = useState([]);




  const [publishedTemplates, setPublishedTemplates] = useState([
    { id: 1, code: "DOC-001", rev: "00", date: "2025-01-21", title: "BSCS Capstone Guidelines", createdBy: "Daniel Cruz" },
    { id: 2, code: "DOC-002", rev: "01", date: "2025-02-14", title: "Student Handbook 2025", createdBy: "Sarah Dela Cruz" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 4, code: "DOC-004", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 5, code: "DOC-005", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
  ]);

  const [dashboard, setDashboard] = useState({
    udcPending: 0,
    approved: 0,
    published: 0,
    total: 0
  });


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
            const id = row._id ?? row.id;
            navigate(`/document-controller/document-workflow/${id}`, { state: { doc: row, origin: "dashboard:recently-submitted" } });
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
            const id = row._id ?? row.id;
            navigate(`/templates/published/${id}`, { state: { doc: row, origin: "dashboard:recently-published" } });
          }}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];


  const upcomingDeadlines = [
    {
      id: 1,
      title: "Template Review for AY 2025",
      date: "2025-08-15",
      priority: "Overdue",
      department: "Quality Assurance",
    },
    {
      id: 2,
      title: "Annual Document Audit",
      date: "2025-08-28",
      priority: "Due Today",
      department: "Administration",
    },
    {
      id: 3,
      title: "Syllabus Submission Check",
      date: "2025-09-10",
      priority: "Upcoming",
      department: "Academics",
    },
  ];

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchDashboardInfoAPI(user);
        if (!mounted) return;
        // Normalize various possible server shapes and pick counts based on current user's role
        // Server may return snake_case or camelCase and either per-role scoped counts or an analytics.global block.
        const server = (data && data.data) ? data.data : data || {};
        const counts = server.counts || server.analytics?.global || server;

        const getVal = (...keys) => {
          for (const k of keys) {
            if (counts == null) continue;
            if (typeof counts[k] === 'number') return counts[k];
            if (counts[k] != null) return counts[k];
          }
          return 0;
        };

        const roleStr = (user?.role?.name || user?.role || '').toString().toLowerCase();
        let pending = 0;
        let responded = 0;

        if (roleStr.includes('unit')) {
          pending = getVal('udc_pending', 'udcPending', 'udcCount', 'udc_pending');
          responded = getVal('udc_responded', 'udcResponded', 'udc_approvals', 'udcApprovals', 'approved');
        } else if (roleStr.includes('lead')) {
          pending = getVal('ldc_pending', 'ldcPending', 'ldc_endorsed', 'ldcEndorsed', 'ldcCount');
          responded = getVal('ldc_responded', 'ldcResponded', 'ldc_approvals', 'ldcApprovals', 'approved');
        } else if (roleStr.includes('document') || roleStr.includes('officer') || roleStr.includes('dco')) {
          pending = getVal('dco_ready', 'dcoReady', 'dcoCount');
          responded = getVal('dco_responded', 'dcoResponded', 'dco_approvals', 'dcoApprovals', 'approved');
        } else {
          // default to global totals if role not recognized
          pending = getVal('udc_pending', 'udcPending', 'udcCount') || getVal('ldc_pending', 'ldcPending') || getVal('dco_ready', 'dcoReady');
          responded = getVal('approved', 'responded', 'total');
        }

        setDashboard({
          udcPending: pending || 0,
          approved: responded || 0,
          published: getVal('published', 'publishedCount', 'published_at') || 0,
          total: getVal('total', 'totalCount') || 0,
        });

        // map server-published items into table rows
        const mapped = (data.publishedTemplates || []).map((t, idx) => ({
          id: t.id || t._id || idx,
          code: t.document_code || t.documentCode || "",
          rev: t.revision_no ?? t.rev ?? "",
          date: t.effectivity || t.createdAt || t.published_at || null,
          title: t.title,
          createdBy: t.createdByName || t.created_by_user?.displayName || t.created_by || "",
          _raw: t
        }));

        // map recently submitted list into template table rows
        const recent = (data.recentlySubmitted || []).map((t, idx) => ({
          id: t.id || t._id || idx,
          title: t.title,
          createdBy: t.createdByName || t.created_by || '',
          status: t.status || '',
          _raw: t
        }));

        if (recent.length) setTemplates(recent);

        if (mapped.length) setPublishedTemplates(mapped);
      } catch (err) {
        // ignore for now; keep defaults
        console.error("Failed to load dashboard info", err);
      }
    };
    load();
    return () => { mounted = false; };
  }, [user]);


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

          {/* Stat cards (Assigned card removed) */}
          <div className="flex flex-wrap gap-4 items-stretch mb-8 mt-4">
            {/* Pending Approvals */}
            <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
              <div className="w-12 h-12 bg-[#FB8C00] rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Pending Approvals</div>
                <div className="text-3xl font-bold text-gray-900">{dashboard?.udcPending ?? 0}</div>
              </div>
            </div>

            {/* Approved */}
            <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
              <div className="w-12 h-12 bg-[#43A047] rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Responded</div>
                <div className="text-3xl font-bold text-gray-900">{dashboard?.approved ?? 0}</div>
              </div>
            </div>
          </div>



          {/* Tables and Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      RECENTLY SUBMITTED TEMPLATES
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 rounded" />
                  </div>

                  <button
                    onClick={() => navigate("/templates", { state: { status: "Published" } })}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
                </div>


                {/* table wrapper for horizontal scroll on mobile */}
                <div className="overflow-x-auto">
                  <Table columns={templateColumns} data={templates} />
                </div>
              </div>
            </div>


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


              <div className="overflow-x-auto">
                <Table
                  columns={publishedTemplatesColumns}
                  data={publishedTemplates}
                />
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