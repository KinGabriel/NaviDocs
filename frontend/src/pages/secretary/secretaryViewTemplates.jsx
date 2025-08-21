import { useParams, useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";

// ----- Placeholder template 
const PLACEHOLDER_TEMPLATE = {
  code: "T001",
  title: "Student Form",
  document_code: "FM-VAA-047",
  revision_no: 0,
  effectivity: "2023-08-01",
  pages: 1,
  document_size: "8.5 x 13",
};

export default function SecretaryTemplateView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams(); // ready for real API usage later

  // Use placeholders 
  const t = PLACEHOLDER_TEMPLATE;

  // Button handlers 
  const handleAssign = () => alert("Assign Members (placeholder)");
  const handleApprove = () => alert("Approve Template (placeholder)");
  const handleRequestChange = () => alert("Request Change (placeholder)");

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="flex-none">
          <Sidebar user={user} active="Templates" />
        </div>

        {/* Dashboard-style wrapper for consistent spacing */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Back + Page title */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-wide underline underline-offset-4">
                View Template
              </h1>
            </div>

            {/* Chip header (code + title) */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex-1">
                <div className="bg-[#EFF3FF] text-gray-900 rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="text-sm font-semibold">
                    {t.code}
                    <div className="w-10 h-0.5 bg-yellow-400 mt-1 rounded" />
                  </div>
                  <div className="text-base sm:text-lg font-medium">{t.title}</div>
                </div>
              </div>

              {/* Right-side action buttons */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleAssign}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#0035DA] text-[#0035DA] bg-white hover:bg-[#EFF3FF] transition"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">Assign Members</span>
                </button>

                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-600 text-green-700 bg-white hover:bg-green-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Approve Templates</span>
                </button>

                <button
                  onClick={handleRequestChange}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm font-medium">Request Change</span>
                </button>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Left: template preview */}
              <section className="col-span-12 lg:col-span-9">
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 p-6">
                    <div
                      className="mx-auto bg-white shadow border rounded-md w-full"
                      style={{ minHeight: 900 }}
                    >
                      {/* Replace with <iframe src={...}/> or <img/> once available */}
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-lg font-medium mb-1">
                            Template Preview
                          </div>
                          <div className="text-sm">
                            This is a placeholder surface for the PDF/image.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile action buttons (show below preview on small screens) */}
                <div className="lg:hidden mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleAssign}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#0035DA] text-[#0035DA] bg-white hover:bg-[#EFF3FF] transition"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="text-sm font-medium">Assign Members</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-green-600 text-green-700 bg-white hover:bg-green-50 transition"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Approve Templates</span>
                  </button>

                  <button
                    onClick={handleRequestChange}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-500 text-amber-700 bg-white hover:bg-amber-50 transition"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm font-medium">Request Change</span>
                  </button>
                </div>
              </section>

              {/* Right: details card */}
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white border rounded-lg shadow-sm">
                  <div className="p-5">
                    <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                      Detailed Information
                    </h3>
                    <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                    <DetailRow label="Document code" value={t.document_code} />
                    <DetailRow label="Revision No." value={String(t.revision_no)} />
                    <DetailRow label="Effectivity" value={t.effectivity} />
                    <DetailRow label="Pages" value={String(t.pages)} />
                    <DetailRow label="Document size" value={t.document_size} />
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Helper row for details list
function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4">{value}</span>
    </div>
  );
}
