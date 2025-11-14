import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";

export default function DepartmentHeadDocumentView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  // Use passed state if ever provided; otherwise build a placeholder from the id
  const doc = useMemo(() => {
    const isPublished = String(id || "").startsWith("DH-PUB-");
    return (
      state?.doc || {
        id,
        code: "DOC-XXX-000",
        rev: "--",
        eff: "YY-MM-DD",
        title: "Document Title Placeholder",
        createdBy: "Faculty Placeholder",
        ownedBy: "Owner Placeholder",
        due: "YY-MM-DD",
        status: isPublished ? "Published" : "Submitted",
      }
    );
  }, [id, state]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Document Workflow" />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-6 px-3 mx-6 mt-8 rounded-xl">
          <main className="p-5 flex-1 overflow-y-auto">
            {/* Page heading */}
            <div className="flex-1 px-1 py-3">
              <h1 className="text-3xl font-bold tracking-widest uppercase">Documents</h1>
              <div className="w-28 h-1 bg-yellow-400 mb-6 rounded" />
            </div>

            {/* Back button */}
            <div className="mb-3">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0035DA] hover:bg-[#043485] text-white text-sm transition shadow-sm"
                title="Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back</span>
              </button>
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-3 mb-4">
              <div>
                <div className="font-semibold">
                  {doc.title} {!!doc.id && <span className="text-gray-400">({doc.id})</span>}
                </div>
                <div className="text-xs text-gray-500">Updated about 1 hour ago</div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download as PDF */}
                <button
                  onClick={() => window.alert("Downloading PDF… (placeholder)")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0035DA] hover:bg-[#043485] text-white text-sm transition shadow-sm"
                  title="Download as PDF"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12l4.5 4.5L16.5 12M12 16.5V3" />
                  </svg>
                  <span>Download as PDF</span>
                </button>

                {/* Edit */}
                <button
                  onClick={() => window.alert("Edit UI will be wired later")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0035DA] hover:bg-[#043485] text-white text-sm transition shadow-sm"
                  title="Edit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.862 4.487a2.25 2.25 0 013.182 3.182L10.06 17.653a6 6 0 01-2.4 1.5l-2.518.72.72-2.518a6 6 0 011.5-2.4l9.5-9.468z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M18 13.5V18A2.5 2.5 0 0 1 15.5 20.5H6" />
                  </svg>
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Preview */}
              <section className="lg:col-span-9">
                <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                  <div className="aspect-[8.5/11] bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-700">Document Preview</div>
                      <p className="text-sm text-gray-500">
                        (placeholder image / PDF render goes here)
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Details */}
              <aside className="lg:col-span-3">
                <div className="bg-white rounded-xl border shadow-sm">
                  <div className="p-4 border-b">
                    <h2 className="text-sm font-semibold tracking-wide">DETAILED INFORMATION</h2>
                    <div className="w-12 h-0.5 bg-yellow-400 mt-2 rounded" />
                  </div>
                  <div className="p-4 space-y-3 text-sm">
                    <DetailRow label="Document code" value={doc.code} />
                    <DetailRow label="Revision No." value={doc.rev} />
                    <DetailRow label="Effectivity" value={doc.eff} />
                    <DetailRow label="Pages" value="1" />
                    <DetailRow label="Document size" value="8.5 x 13" />
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

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}