import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderTemplateView from "../components/headerTemplateView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI, approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI, assignControllersToTemplateAPI } from "../api/documentContollerAPI";
import { formatDateTime } from "../utils/formatters";
import AssignMembersModal from "../components/modals/assignMembersModal";

export default function TemplateView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTemplateByIdAPI(id)
      .then(res => {
        console.log("Fetched template:", res);
        setTemplate(res.template);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to fetch template");
        setLoading(false);
      });
  }, [id]);

  // Assign Members — open modal with preselected + fetch assignable faculty
  const handleAssign = async () => {
    if (!template) return;
    // Preselect only the ids from template.assigned, matching by index with template.assignedNames
    const assigned = Array.isArray(template.assigned) ? template.assigned : [];
    setSelectedIds(assigned);
    setAssignOpen(true);
  };

  // Approval modal handlers
  const handleApprove = async (templateData, message) => {
    if (!templateData || !user) return;
    try {
      const payload = {};
      const res = await approveTemplateAPI(templateData._id, payload);
      setTemplate(res.template);
    } catch (err) {
      setError("Failed to approve template");
    }
  };

  const handleReject = async (templateData, message) => {
    if (!templateData || !user) return;
    if (!message || !message.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    try {
      const res = await rejectTemplateAPI(templateData._id, message);
      setTemplate(res.template);
    } catch (err) {
      setError("Failed to reject template");
    }
  };

  const handleReturn = async (templateData, message) => {
    if (!templateData || !user) return;
    if (!message || !message.trim()) {
      setError("Please provide a reason for returning the template.");
      return;
    }
    try {
      const res = await returnTemplateAPI(templateData._id, message);
      setTemplate(res.template);
    } catch (err) {
      setError("Failed to return template");
    }
  };


  // Use API data if loaded, else fallback to placeholder
  const t = template || 'No assignments are instruction';

  //  assigned members 
  const assignedNames = t.assignedNames || [];
  // deadline
  const deadline = t.deadline ? formatDateTime(t.deadline) : null;

  //  approvers 
  let approvalsArr = [];
  if (t.approvals && typeof t.approvals === 'object' && !Array.isArray(t.approvals)) {
    approvalsArr = Object.entries(t.approvals).map(([role, appr]) => ({
      role,
      name: appr.assigned_to_name || appr.assigned_to || '',
      isApproved: appr.isApproved,
    }));
  } else if (Array.isArray(t.approvals)) {
    approvalsArr = t.approvals;
  }

  //  handle to prepare notes 
  const notes = Array.isArray(t.notes) ? t.notes : [];

  // Handler to refresh template after adding instructions
  const handleAddInstructions = async () => {
    if (!id) return;
    const refreshed = await getTemplateByIdAPI(id);
    setTemplate(refreshed.template || refreshed.data || refreshed);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderTemplateView
        template={t}
        user={user}
        handleAssign={handleAssign}
        handleApprove={handleApprove}
        handleReject={handleReject}
        handleReturn={handleReturn}
        onUpdateDeadline={async () => {
          if (!id) return;
          const refreshed = await getTemplateByIdAPI(id);
          setTemplate(refreshed.template || refreshed.data || refreshed);
        }}
        onAddInstructions={handleAddInstructions}
      />
         <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Content grid */}
            <div className="grid grid-cols-12 gap-6">
              {/* Template preview */}
              <section className="col-span-12 lg:col-span-8">
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
              </section>

              {/* Details*/}
             <aside className="col-span-12 lg:col-span-4">
               {/* Template Status Panel */}
               <div className="bg-white border rounded-md shadow-sm mb-4">
                 <div className="p-5">
                   <div className="mb-4">
                     <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                       Template Status
                     </h3>
                     <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                     <div className="text-base text-gray-900 font-sans">
                       {t.status === 'assigned' && (
                         <>Document controllers are still working on the template.</>
                       )}
                       {t.status === 'pending' && (
                         ((user?.role?.name === "Dean" && t.status_meta?.approvals?.secretary?.isApproved !== false) ||
                          (user?.role?.name === "Secretary" && t.status_meta?.approvals?.secretary?.isApproved !== true)) ? (
                           <>Template is awaiting your approval.</>
                         ) : (
                           <>Template is awaiting approval from assigned approvers.</>
                         )
                       )}
                       {t.status === 'approved' && (
                         <>Template has been fully approved and is ready for publishing by the document controller.</>
                       )}
                       {t.status === 'published' && (
                         <>Template is published and available for use.</>
                       )}
                       {t.status === 'rejected' && (
                         <>Template was rejected.</>
                       )}
                       {t.status === 'returned' && (
                         <>Template was returned for changes.</>
                       )}
                     </div>
                   </div>
                 </div>
               </div>
               <div className="bg-white border rounded-md shadow-sm">
                 <div className="p-5">
                   <div className="mb-4">
                     <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                       Deadline
                     </h3>
                     <div className="text-base text-gray-900">{deadline}</div>
                   </div>
                    <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                      Assigned Members
                    </h3>
                    
                    <ul className="mb-6">
                      {assignedNames.length > 0 ? (
                        assignedNames.map((name, idx) => (
                          <li key={idx} className="text-sm text-gray-800 mb-1 flex items-center">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {name}
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400">No members assigned.</li>
                      )}
                    </ul>
                    <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                      To be approved by
                    </h3>
                    
                    <ul className="mb-6">
                      {approvalsArr.length > 0 ? (
                        approvalsArr.map((approver, idx) => (
                          <li key={idx} className="flex mb-2 text-sm">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800 flex items-center">
                                {approver.name} ({approver.role})
                                {approver.isApproved === true ? (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs">Approved</span>
                                ) : status === 'rejected' ? (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">Rejected</span>
                                ) : (
                                  <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs">Pending</span>
                                )}
                              </span>
                            </div>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-400">No approvers assigned.</li>
                      )}
                    </ul>
                    <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans">
                      Notes
                    </h3>
                    <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                    <ul>
                      {notes.length > 0 ? (
                        notes.map((note, idx) => (
                          <li key={idx} className="mb-3">
                            <div className="text-xs text-gray-500 mb-1 font-sans">
                              {note.added_by_name || note.added_by || ''} &middot; {formatDateTime(note.created_at)}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">{note.type || 'Note'}</div>
                            <div className="text-base text-gray-800 font-sans">{note.message}</div>
                          </li>
                        ))
                      ) : (
                        <li className="text-base text-gray-400 font-sans">No notes available.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          </main>
        </div>
        {/* Assign Members Modal */}
        <AssignMembersModal
          open={assignOpen}
          onClose={() => { setAssignOpen(false); setSelectedIds([]); }}
          template={t}
          faculty={faculty}
          facultyLoading={facultyLoading}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          submitting={assignSubmitting}
          onAssign={async ({ assignees }) => {
            if (!template?._id) return;
            setAssignSubmitting(true);
            try {
              await assignControllersToTemplateAPI(template._id, assignees);
              const refreshed = await getTemplateByIdAPI(template._id);
              setTemplate(refreshed.template || refreshed.data || refreshed);
              setAssignOpen(false);
              setSelectedIds([]);
            } catch (e) {
              console.error(e);
              setError("Failed to assign members.");
            } finally {
              setAssignSubmitting(false);
            }
          }}
        />
      </div>
  );
}