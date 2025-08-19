import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdown';
import TemplateCard from '../../components/templatecard';
import CreateTemplateModal from '../../components/modals/createTemplateModal';
import usePagination from '../../hooks/usePagination';
import { fetchTemplatesAPI, createTemplateAPI, approveTemplateAPI, publishTemplateAPI } from '../../api/documentContollerAPI';

// --- mock data (replace with your API calls) ---
const SUBMITTED = [
  { id: "D100", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Data Mining Course Syllabi 26-27", createdBy: "Daniela Torres", due: "26-01-10", status: "Submitted" },
  { id: "D200", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Web Technologies Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", due: "26-01-10", status: "Submitted" },
  { id: "D300", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Special Topics 1 Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", due: "26-01-10", status: "Submitted" },
  { id: "D400", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Applications Development Course Syllabi 26-27", createdBy: "Mark Gomez", due: "26-01-10", status: "Submitted" },
  { id: "D500", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "IT Capstone Project 1 Course Syllabi", createdBy: "Jana Aquino", due: "26-01-10", status: "Submitted" },
  { id: "D600", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Computer Programming 1 Course Syllabi", createdBy: "Gabriel Catiliano", due: "26-01-10", status: "Submitted" },
  { id: "D700", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Computer Programming 2 Course Syllabi", createdBy: "Gaile Reyes", due: "26-01-10", status: "Submitted" },
  { id: "D800", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Human Computer Interaction Course Syllabi", createdBy: "Oliver Bearman", due: "26-01-10", status: "Submitted" },
  { id: "D900", code: "FM-SAA-002", rev: "00", eff: "26-01-16", title: "Computer Architecture Course Syllabi", createdBy: "Alisha Cruz", due: "26-01-10", status: "Submitted" },
];

const OWNERS = ["Daniela Torres","Sarah Dela Cruz","Mark Gomez","Jana Aquino","Gabriel Catiliano","Gaile Reyes","Oliver Bearman","Alisha Cruz"];
const PUBLISHED = SUBMITTED.map((r, i) => ({ ...r, status: "Published", ownedBy: OWNERS[i % OWNERS.length] }));

export default function DocumentControllerWorkflow() {
  const user = useUser(); // raw user in your project
  const navigate = useNavigate();

  const [tab, setTab] = useState("submitted");      // 'submitted' | 'published'
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");   // recent | az | za
  const [peopleFilter, setPeopleFilter] = useState(null);

  const baseRows = tab === "submitted" ? SUBMITTED : PUBLISHED;

  const filtered = useMemo(() => {
    let rows = [...baseRows];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.id + r.code + r.title + (tab === "submitted" ? r.createdBy : r.ownedBy)).toLowerCase().includes(q)
      );
    }
    if (peopleFilter) {
      rows = rows.filter((r) => (tab === "submitted" ? r.createdBy : r.ownedBy) === peopleFilter);
    }
    if (sortBy === "az") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") rows.sort((a, b) => b.title.localeCompare(a.title));
    return rows;
  }, [baseRows, query, sortBy, peopleFilter, tab]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const { currentPage, handlePrev, handleNext, handlePage, getPageNumbers } = usePagination(totalPages, 1);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage]
  );

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const peopleList = useMemo(() => {
    const s = new Set();
    (tab === "submitted" ? SUBMITTED : PUBLISHED).forEach((r) => s.add(tab === "submitted" ? r.createdBy : r.ownedBy));
    return Array.from(s);
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-wide">
              {tab === "submitted" ? "SUBMITTED DOCUMENTS" : "PUBLISHED DOCUMENTS"}
            </h1>
            <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
            <div className="relative" ref={filterRef}>
              <button onClick={() => setFilterOpen((v) => !v)} className="px-4 py-2 rounded-md bg-[#0E43A0] text-white font-semibold flex items-center gap-2">
                Filter by
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </button>
              {filterOpen && (
                <div className="absolute z-20 mt-2 w-60 bg-white rounded-lg shadow-lg border p-3">
                  <div className="text-xs text-gray-500 font-semibold mb-2">People</div>
                  <div className="max-h-56 overflow-auto space-y-1">
                    <button className={`w-full text-left px-2 py-1 rounded ${!peopleFilter ? "bg-gray-100" : "hover:bg-gray-50"}`} onClick={() => setPeopleFilter(null)}>All</button>
                    {peopleList.map((p) => (
                      <button key={p} className={`w-full text-left px-2 py-1 rounded ${peopleFilter === p ? "bg-gray-100" : "hover:bg-gray-50"}`} onClick={() => setPeopleFilter(p)}>{p}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={sortRef}>
              <button onClick={() => setSortOpen((v) => !v)} className="px-4 py-2 rounded-md bg-[#0E43A0] text-white font-semibold flex items-center gap-2">
                Sort by
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </button>
              {sortOpen && (
                <div className="absolute z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                  {[
                    { key: "recent", label: "Recent" },
                    { key: "az", label: "Title A–Z" },
                    { key: "za", label: "Title Z–A" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${sortBy === opt.key ? "bg-gray-100" : "hover:bg-gray-50"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 md:ml-auto">
              <div className="relative">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full md:w-96 border border-gray-300 rounded-md pl-10 pr-3 py-2 bg-white" />
                <svg className="absolute left-3 top-2.5" width="18" height="18" viewBox="0 0 24 24"><path fill="#0E43A0" d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-4.23C15.91 6.01 12.9 3 9.45 3A6.46 6.46 0 003 9.45c0 3.45 3.01 6.46 6.45 6.46 1.61 0 3.09-.59 4.23-1.48l.27.28v.79l4.99 4.98L20.49 19 15.5 14zm-6.05 0C6.47 14 4 11.53 4 8.95S6.47 4 9.05 4 14.1 6.47 14.1 9.05 11.63 14 9.45 14z"/></svg>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-5">
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button onClick={() => setTab("submitted")} className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "submitted" ? "bg-white shadow text-[#0E43A0]" : "text-gray-600"}`}>Submitted</button>
              <button onClick={() => setTab("published")} className={`px-4 py-2 rounded-full text-sm font-semibold ${tab === "published" ? "bg-white shadow text-[#0E43A0]" : "text-gray-600"}`}>Published</button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="min-w-full table-auto border-separate border-spacing-0">
              <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                  <Th>ID</Th>
                  <Th>Document Code</Th>
                  <Th>Revision No.</Th>
                  <Th>Effectivity</Th>
                  <Th>Title</Th>
                  {tab === "submitted" ? <Th>Created By</Th> : <Th>Owned By</Th>}
                  <Th>Due Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right pr-4">Actions</Th>
              </tr>
              </thead>

              <tbody>
              {pageRows.length === 0 && (
                  <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                      No results.
                  </td>
                  </tr>
              )}

              {pageRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                  <Td>{r.id}</Td>
                  <Td className="text-[#003DA5] font-medium">
                      <div className="whitespace-normal break-words">{r.code}</div>
                  </Td>
                  <Td>{r.rev}</Td>
                  <Td>{r.eff}</Td>
                  <Td className="max-w-[520px]">
                    <div className="whitespace-normal break-words">{r.title}</div>
                  </Td>
                  <Td>{tab === "submitted" ? r.createdBy : r.ownedBy}</Td>
                  <Td>{r.due}</Td>
                  <Td>
                      <StatusBadge type={r.status} />
                  </Td>
                  <Td className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                      <button
                          className="px-3 py-1.5 rounded border text-sm font-medium hover:bg-gray-100"
                          onClick={() => navigate(`/document-controller/documents/${r.id}`)}
                      >
                          View
                      </button>
                      <button className="h-8 w-8 rounded hover:bg-gray-100 grid place-items-center">
                          <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#6b7280" d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                      </button>
                      </div>
                  </Td>
                  </tr>
              ))}
              </tbody>
          </table>
          </div>


          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 text-sm">
            <button onClick={handlePrev} disabled={currentPage === 1} className={`flex items-center gap-2 px-2 py-1 rounded ${currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100"}`}>
              <span className="text-lg">←</span> Previous
            </button>
            <div className="flex items-center gap-1">
              {getPageNumbers().map((n, idx) =>
                n === "..." ? <span key={`dots-${idx}`} className="px-2">…</span> : (
                  <button key={n} onClick={() => handlePage(n)} className={`h-8 w-8 rounded-full grid place-items-center ${n === currentPage ? "bg-black text-white" : "hover:bg-gray-100"}`}>{n}</button>
                )
              )}
            </div>
            <button onClick={handleNext} disabled={currentPage === totalPages} className={`flex items-center gap-2 px-2 py-1 rounded ${currentPage === totalPages ? "text-gray-400" : "hover:bg-gray-100"}`}>
              Next <span className="text-lg">→</span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider align-middle
        border-b border-gray-200 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td
      className={`px-4 py-4 align-middle leading-6 whitespace-normal break-words
        border-t border-gray-200 ${className}`}
    >
      {children}
    </td>
  );
}

function StatusBadge({ type }) {
  const isPublished = String(type).toLowerCase() === "published";
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold
      ${isPublished ? "bg-green-50 text-green-700 border border-green-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
      <span className="h-2 w-2 rounded-full bg-green-500" />
      {isPublished ? "Published" : "Submitted"}
    </span>
  );
}
