import React, { useState, useMemo, useEffect } from 'react';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import Dropdown3 from '../../components/dropdowns/dropdown3';
import useUser from '../../hooks/useUser'; 
import { fetchSchoolStaffAPI } from '../../api/userAPI';

export default function TaskAssignmentPanel({ onAssign }) {
  const user = useUser();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [docControllers, setDocControllers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [assignedApprover, setAssignedApprover] = useState('');

  // Fetch staff on mount
  useEffect(() => {
    setLoadingStaff(true);
    fetchSchoolStaffAPI()
      .then(({ docControllers, secretaries }) => {
        setDocControllers(docControllers);
        setSecretaries(secretaries);
        // Do not preselect any user or approver on first load
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .catch(() => {
        setDocControllers([]);
        setSecretaries([]);
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .finally(() => setLoadingStaff(false));
  }, []);


  // Determine role from user context
  const userRole = user?.role?.name === 'Secretary' ? 'Secretary' : 'Dean';

  // Approvers: if Dean, show secretaries; if Secretary, show deans
  const assignUserOptions = docControllers;
  const approverOptions = userRole === 'Dean' ? secretaries : [];
  const approverLabel = userRole === 'Dean' ? 'Secretary (Approver/Checker)' : 'Dean (Approver/Checker)';
  const approverPlaceholder = userRole === 'Dean' ? 'Select secretary...' : 'Select dean...';

  // Update assignedApprover if approverOptions change
  useEffect(() => {
    // Only set if not already selected 
    if (!assignedApprover && approverOptions.length > 0) {
      setAssignedApprover('');
    }
  }, [userRole, approverOptions]);

  // Update assignedUsers if assignUserOptions change
  useEffect(() => {
    // Only set if not already selected 
    if (assignedUsers.length === 0 && assignUserOptions.length > 0) {
      setAssignedUsers([]);
    }
  }, [userRole, assignUserOptions]);

  const handleAssign = () => {
    if (title && assignedUsers.length > 0 && assignedApprover) {
      onAssign?.({
        title,
        instructions,
        dueDate,
        assignedUsers,
        assignedApprover,
      });
      setTitle('');
      setInstructions('');
      setDueDate('');
      setAssignedUsers(docControllers.length > 0 ? [docControllers[0].id] : []);
      setAssignedApprover(approverOptions.length > 0 ? approverOptions[0].id : '');
    }
  };

  if (loadingStaff) {
    return <div className="p-4">Loading staff...</div>;
  }

  return (
    <div className="mb-6 p-4 bg-white border border-slate-200 rounded shadow flex flex-col gap-4 max-w-3xl">
      <div className="font-bold text-xl text-slate-700 mb-2">Add the details of your assignment</div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Title</label>
          <input
            className="border rounded px-3 py-2 text-base w-full"
            placeholder="Enter assignment title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-1">Instructions <span className='font-normal text-xs'>(optional)</span></label>
          <textarea
            className="border rounded px-3 py-2 text-base w-full"
            placeholder="Add instructions for this assignment (optional)"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="min-w-[180px]">
            <MultiSelectDropdown
              label="Assign User(s)"
              options={assignUserOptions.map(u => ({ value: u.id, label: u.name }))}
              value={assignedUsers}
              onChange={setAssignedUsers}
              placeholder="Select user(s)..."
            />
          </div>
          <div className="min-w-[180px]">
            <Dropdown3
              label={approverLabel}
              value={assignedApprover}
              onChange={setAssignedApprover}
              options={approverOptions.map(u => ({ value: u.id, label: u.name }))}
              placeholder={approverPlaceholder}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Due</label>
            <input
              type="date"
              className="border rounded px-2 py-1"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700"
            onClick={handleAssign}
            disabled={!title || assignedUsers.length === 0 || !assignedApprover}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
