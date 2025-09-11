
import React, { useState, useMemo, useEffect } from 'react';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import Dropdown3 from '../../components/dropdowns/dropdown3';
import useUser from '../../hooks/useUser';
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { assignUsersToTemplate } from '../../api/assignmentAPI';

export default function TaskAssignmentPanel({ templateId, onAssign }) {
  const user = useUser();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [docControllers, setDocControllers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [deans, setDeans] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [assignedApprover, setAssignedApprover] = useState('');

  // Fetch staff on mount
  useEffect(() => {
    setLoadingStaff(true);
    fetchSchoolStaffAPI()
      .then(({ docControllers, secretaries, deans }) => {
        setDocControllers(docControllers || []);
        setSecretaries(secretaries || []);
        setDeans(deans || []);
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .catch(() => {
        setDocControllers([]);
        setSecretaries([]);
        setDeans([]);
        setAssignedUsers([]);
        setAssignedApprover('');
      })
      .finally(() => setLoadingStaff(false));
  }, []);


  // Determine role from user context
  const userRole = user?.role?.name === 'Secretary' ? 'Secretary' : 'Dean';

  // Approvers: if Dean, show secretaries; if Secretary, show deans
  let assignUserOptions = [];
  let approverOptions = [];
  let approverLabel = '';
  let approverPlaceholder = '';

  if (userRole === 'Dean') {
    assignUserOptions = secretaries;
    approverOptions = docControllers;
    approverLabel = 'Document Controller (Approver/Checker)';
    approverPlaceholder = 'Select document controller...';
  } else {
    assignUserOptions = docControllers;
    approverOptions = deans;
    approverLabel = 'Dean (Approver/Checker)';
    approverPlaceholder = 'Select dean...';
  }

  // Update assignedApprover if approverOptions change
  // Set default assignedApprover when options change
  useEffect(() => {
    if (approverOptions.length > 0) {
      setAssignedApprover(approverOptions[0].id);
    } else {
      setAssignedApprover('');
    }
  }, [userRole, approverOptions]);

  // Set default assignedUsers when options change
  useEffect(() => {
    if (assignUserOptions.length > 0) {
      setAssignedUsers([assignUserOptions[0].id]);
    } else {
      setAssignedUsers([]);
    }
  }, [userRole, assignUserOptions]);

  const handleAssign = async () => {
    console.log("Assigning template:", { title, instructions, deadline, assignedUsers, assignedApprover, templateId });
    if (title && assignedUsers.length > 0 && assignedApprover && deadline) {
      // Prepare templateData (add instructions if needed)
      const templateData = { title, instructions };
      const result = await assignUsersToTemplate(
        templateId,
        assignedUsers,
        assignedApprover,
        templateData,
        deadline ? deadline : undefined
      );
      onAssign?.(result);
  setTitle('');
  setInstructions('');
  setDeadline('');
  setAssignedUsers(assignUserOptions.length > 0 ? [assignUserOptions[0].id] : []);
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
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
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
