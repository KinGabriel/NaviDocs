import React, { useMemo, useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdown";
import SearchBar from "../../components/searchBar";

// ----- Placeholder, grouped by date -----
const PLACEHOLDER_SECTIONS = [
  {
    date: "March 24, 2025",
    docs: Array.from({ length: 4 }, (_, i) => ({
      id: `DOC-FAC-${(i + 1).toString().padStart(3, "0")}`,
      title: "Course Syllabus 2026—2027",
      code: "DOC–FAC–000",
      owner: "FAC",
      createdAt: "March 24, 2025",
      status: "Draft",
      size: i % 2 ? "legal" : "A4",
    })),
  },
  {
    date: "March 23, 2025",
    docs: Array.from({ length: 3 }, (_, i) => ({
      id: `DOC-FAC-${(i + 5).toString().padStart(3, "0")}`,
      title: "Course Syllabus 2026—2027",
      code: "DOC–FAC–000",
      owner: "FAC",
      createdAt: "March 23, 2025",
      status: "Draft",
      size: i % 2 ? "legal" : "A4",
    })),
  },
];

export default function FacultyDocuments() {
  const user = useUser();

  const [schoolFilter, setSchoolFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Recent");
  const [search, setSearch] = useState("");

  // In real data, apply filter/sort/search here. For placeholders we just pass through.
  const sections = useMemo(() => PLACEHOLDER_SECTIONS, []);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Documents" />

        {/* wrapper: aligned with other screens (same paddings/margins) */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-6 px-8 mx-6 mt-8 rounded-xl">
          <div className="p-8 flex-1 overflow-y-auto">

            {/* Title block (tight top margin, consistent underline) */}
            <div className="mb-6 mt-1">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                My Documents
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Dropdown
                options={["All", "FAC", "SAMCIS", "STELA", "University Wide"]}
                value={schoolFilter}
                onChange={setSchoolFilter}
                width="w-40"
              />
              <Dropdown
                options={["Recent", "A-Z", "Z-A"]}
                value={sortBy}
                onChange={setSortBy}
                width="w-32"
              />
              <div className="ml-auto w-full sm:w-96">
                <SearchBar
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                />
              </div>
            </div>

            {/* Date sections */}
            {sections.map((section, index) => (
                <section key={section.date} className="mb-10">
                    <h3 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-3">
                        {section.date}
                    </h3>
                {/* Cards grid – same card size for ALL tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {index === 0 && <NewDocumentCard />}

                        {section.docs.map((d) => (
                            <DocumentCard key={d.id} doc={d} />
                        ))}
                    </div>
                </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------ Cards ------------------ */

function NewDocumentCard() {
  return (
    <div className="group relative bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
      {/* Maintain same height/ratio as DocumentCard */}
      <div className="h-64 bg-gray-50 flex items-center justify-center">
        <button
          type="button"
          className="h-12 w-12 rounded-xl border-2 border-dashed border-gray-300 grid place-items-center group-hover:border-[#0035DA] transition"
          title="Create new document"
          onClick={() => alert("Create New Document (placeholder)")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-gray-500 group-hover:text-[#0035DA]">
            <path fill="currentColor" d="M11 11V6h2v5h5v2h-5v5h-2v-5H6v-2z" />
          </svg>
        </button>
      </div>

      {/* Footer meta (empty but keeps height consistent) */}
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-gray-700">New Document</div>
        <div className="text-xs text-gray-400">Start from scratch</div>
      </div>
    </div>
  );
}

function DocumentCard({ doc }) {
  return (
    <div className="group relative bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
      {/* Status chip */}
      <span className="absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
        {doc.status}
      </span>

      {/* Preview area — same height as NewDocumentCard */}
      <div className="h-64 bg-gray-50 flex flex-col items-center justify-center">
        <svg width="42" height="42" viewBox="0 0 24 24" className="text-gray-300 mb-3">
          <path
            fill="currentColor"
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm4 18H6V4h7v5h5Z"
          />
        </svg>
        <div className="text-sm text-gray-400">Document Preview</div>
        <div className="text-[11px] text-gray-300">{doc.size}</div>
      </div>

      {/* Footer meta */}
      <div className="px-4 py-3 space-y-1">
        <div className="text-sm font-medium text-gray-800 leading-tight line-clamp-2">
          {doc.title}
        </div>
        <button type="button" className="text-xs text-[#0035DA] underline">
          {doc.code}
        </button>

        <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-gray-500">
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
              <path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 4v2h16v-2c0-1.83-3.67-4-8-4Z"/>
            </svg>
            {doc.owner}
          </div>
          <div className="flex items-center gap-1 justify-end">
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
              <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 15H5V10h14z"/>
            </svg>
            Created {doc.createdAt}
          </div>
        </div>

        {/* audience chips */}
        <div className="mt-2 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
            Sec
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 border border-gray-200">
            Dean
          </span>
        </div>
      </div>

      {/* Card menu (placeholder) */}
      <button
        type="button"
        className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full hover:bg-black/5"
        onClick={() => alert("Card menu (placeholder)")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 8a2 2 0 1 0 0-4a2 2 0 0 0 0 4m0 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4m0 6a2 2 0 1 0 0-4a2 2 0 0 0 0 4"/>
        </svg>
      </button>
    </div>
  );
}
