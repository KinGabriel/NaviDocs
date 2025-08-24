import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header.jsx";
import Sidebar from "../../layout/sidebar.jsx";
import useUser from "../../hooks/useUser.jsx";
import usePagination from "../../hooks/usePagination.jsx";
import Table from "../../components/table.jsx";
import Dropdown from "../../components/dropdown.jsx";
import SearchBar from "../../components/searchBar.jsx";
import { StatusBadge } from "../../utils/formatters.jsx";


const DEPARTMENT_HEAD_DOCS = Array.from({ length: 10 }, (_, i) => ({
 id: i + 1,
 code: "DOC-DEPT-000",
 rev: "--",
 eff: "---- -- --",
 title: "Department Head Document Title",
 createdBy: "Faculty Name",
 assignedBy: "Dean", // compared to dean docs, assigned by dean
 due: "-- -- --",
 status: i % 3 === 0 ? "Approved" : i % 3 === 1 ? "Pending" : "Returned",
}));


const STATUS_OPTIONS = ["All", "Approved", "Pending", "Returned"];
const SORT_OPTIONS = ["Recent", "A–Z", "Z–A"];


export default function DepartmentHeadDocuments() {
 const user = useUser();
 const navigate = useNavigate();


 const [query, setQuery] = useState("");
 const [sortBy, setSortBy] = useState("Recent");
 const [statusFilter, setStatusFilter] = useState("All");


 const filtered = useMemo(() => {
   let rows = [...DEPARTMENT_HEAD_DOCS];
   if (statusFilter !== "All") rows = rows.filter((r) => r.status === statusFilter);
   if (query.trim()) {
     const q = query.toLowerCase();
     rows = rows.filter((r) =>
       (r.code + r.title + r.createdBy + r.assignedBy).toLowerCase().includes(q)
     );
   }
   if (sortBy === "A–Z") rows.sort((a, b) => a.title.localeCompare(b.title));
   if (sortBy === "Z–A") rows.sort((a, b) => b.title.localeCompare(a.title));
   return rows;
 }, [query, sortBy, statusFilter]);


 const pageSize = 10;
 const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
 const { currentPage, handlePrev, handleNext, handlePage, getPageNumbers } =
   usePagination(totalPages, 1);


 const pageRows = useMemo(
   () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
   [filtered, currentPage]
 );


 const columns = [
   { key: "code", label: "Document Code" },
   { key: "rev", label: "Revision No." },
   { key: "eff", label: "Effectivity" },
   { key: "title", label: "Title" },
   { key: "createdBy", label: "Created By" },
   { key: "assignedBy", label: "Assigned By" },
   { key: "due", label: "Due Date" },
   {
     key: "status",
     label: "Status",
     render: (row) => <StatusBadge type={row.status} />,
   },
   {
     key: "actions",
     label: "Actions",
     render: (row) => (
       <button
         onClick={() =>
           navigate(`/dept-head/documents/${row.id}`, {
             state: { from: "departmentHead", doc: row },
           })
         }
         className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
       >
         Review
       </button>
     ),
   },
 ];


 return (
   <div className="min-h-screen bg-gray-200 flex flex-col">
     <Header user={user} />
     <div className="flex flex-1">
       <Sidebar user={user} />
       <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
         <main className="p-10 flex-1 overflow-y-auto">
           <div className="mb-8">
             <h1 className="text-3xl font-bold tracking-widest uppercase">
               DEPARTMENT HEAD DOCUMENTS
             </h1>
             <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
           </div>


           <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
             <Dropdown
               options={STATUS_OPTIONS}
               value={statusFilter}
               onChange={setStatusFilter}
               width="w-44"
               label="Filter"
               buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
             />
             <Dropdown
               options={SORT_OPTIONS}
               value={sortBy}
               onChange={setSortBy}
               width="w-36"
               label="Sort"
               buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
             />
             <div className="flex-1 md:ml-auto w-full md:w-96">
               <SearchBar
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 placeholder="Search..."
                 width="w-40"
               />
             </div>
           </div>


           <Table columns={columns} data={pageRows} />


           <div className="flex items-center justify-between mt-6 text-sm">
             <button
               onClick={handlePrev}
               disabled={currentPage === 1}
               className={`flex items-center gap-2 px-2 py-1 rounded ${
                 currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100"
               }`}
             >
               ← Previous
             </button>
             <div className="flex items-center gap-1">
               {getPageNumbers().map((n, idx) =>
                 n === "..." ? (
                   <span key={idx}>…</span>
                 ) : (
                   <button
                     key={n}
                     onClick={() => handlePage(n)}
                     className={`h-8 w-8 rounded-full grid place-items-center ${
                       n === currentPage
                         ? "bg-[#0035DA] text-white"
                         : "hover:bg-gray-100"
                     }`}
                   >
                     {n}
                   </button>
                 )
               )}
             </div>
             <button
               onClick={handleNext}
               disabled={currentPage === totalPages}
               className={`flex items-center gap-2 px-2 py-1 rounded ${
                 currentPage === totalPages
                   ? "text-gray-400"
                   : "hover:bg-gray-100"
               }`}
             >
               Next →
             </button>
           </div>
         </main>
       </div>
     </div>
   </div>
 );
}
