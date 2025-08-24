import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";


const PLACEHOLDER_DOC = {
 title: "Department Head Form",
 updatedAgo: "about 2 hours ago",
 document_code: "FM-DEPT-001",
 revision_no: 0,
 effectivity: "2023-09-01",
 pages: 1,
 document_size: "8.5 x 13",
};


export default function DepartmentHeadViewDocuments() {
 const user = useUser();
 const navigate = useNavigate();
 const { id } = useParams();
 const location = useLocation();


 const passedDoc = location.state?.doc;
 const doc = {
   title: passedDoc?.title || PLACEHOLDER_DOC.title,
   updatedAgo: passedDoc?.updatedAgo || PLACEHOLDER_DOC.updatedAgo,
   document_code: passedDoc?.document_code || passedDoc?.code || PLACEHOLDER_DOC.document_code,
   revision_no: passedDoc?.revision_no ?? passedDoc?.rev ?? PLACEHOLDER_DOC.revision_no,
   effectivity: passedDoc?.effectivity || passedDoc?.eff || PLACEHOLDER_DOC.effectivity,
   pages: passedDoc?.pages ?? PLACEHOLDER_DOC.pages,
   document_size: passedDoc?.document_size || PLACEHOLDER_DOC.document_size,
 };


 const handleDownload = () => alert("Download as PDF (placeholder)");
 const handleEdit = () => alert("Edit document (placeholder)");
 const handleUnpublish = () => alert("Unpublish document (placeholder)");


 return (
   <div className="min-h-screen bg-gray-200 flex flex-col">
     <Header user={user} />
     <div className="flex flex-1">
       <Sidebar user={user} active="Department Head Documents" />


       <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
         <main className="p-8 flex-1 overflow-y-auto">
           <h1 className="text-3xl font-semibold tracking-wide mb-6">
             Department Head Document
           </h1>


           <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
             <div className="flex-1">
               <div className="bg-[#EFF3FF] text-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                 <div className="font-medium">{doc.title}</div>
                 <div className="text-gray-500 text-sm flex items-center gap-1">
                   Updated {doc.updatedAgo}
                 </div>
               </div>
             </div>


             <div className="flex items-center gap-2">
               <button
                 onClick={handleDownload}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
               >
                 Download as PDF
               </button>
               <button
                 onClick={handleEdit}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
               >
                 Edit
               </button>
               <button
                 onClick={handleUnpublish}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-[#0035DA] hover:bg-[#043485] font-semibold transition-colors"
               >
                 Unpublish
               </button>
             </div>
           </div>


           <div className="grid grid-cols-12 gap-6">
             <section className="col-span-12 lg:col-span-9">
               <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                 <div className="bg-gray-50 p-6">
                   <div
                     className="mx-auto bg-white shadow border rounded-md w-full"
                     style={{ minHeight: 900 }}
                   >
                     <div className="h-full w-full flex items-center justify-center text-gray-400">
                       <div className="text-center">
                         <div className="text-lg font-medium mb-1">Document Preview</div>
                         <div className="text-sm">Placeholder for PDF/Image preview.</div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </section>


             <aside className="col-span-12 lg:col-span-3">
               <div className="bg-white border rounded-lg shadow-sm">
                 <div className="p-5">
                   <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                     Document Details
                   </h3>
                   <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />


                   <DetailRow label="Document code" value={doc.document_code} />
                   <DetailRow label="Revision No." value={String(doc.revision_no)} />
                   <DetailRow label="Effectivity" value={doc.effectivity} />
                   <DetailRow label="Pages" value={String(doc.pages)} />
                   <DetailRow label="Document size" value={doc.document_size} />
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
   <div className="flex items-start justify-between py-2 border-b last:border-b-0">
     <span className="text-sm text-gray-600">{label}</span>
     <span className="text-sm text-gray-900 ml-4">{value}</span>
   </div>
 );
}
