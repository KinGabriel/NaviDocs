

import React, { useState } from 'react';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import Dropdown3 from '../../components/dropdowns/dropdown3';

const users = [
  { id: 'u1', name: 'Nichole Jhoy Escano' },
  { id: 'u2', name: 'Gabriel Castiliano' },
];
const secretaries = [
  { id: 's1', name: 'Michael Bay' },
  { id: 's2', name: 'Jan Vin Malaluan' },
];

export default function TaskAssignmentPanel({ onAssign }) {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedUsers, setAssignedUsers] = useState([users[0].id]);
  const [assignedSecretary, setAssignedSecretary] = useState(secretaries[0].id);

  const handleAssign = () => {
    if (title && assignedUsers.length > 0 && assignedSecretary) {
      onAssign?.({
        title,
        instructions,
        dueDate,
        assignedUsers,
        assignedSecretary,
      });
      setTitle('');
      setInstructions('');
      setDueDate('');
      setAssignedUsers([users[0].id]);
      setAssignedSecretary(secretaries[0].id);
    }
  };

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
              options={users.map(u => ({ value: u.id, label: u.name }))}
              value={assignedUsers}
              onChange={setAssignedUsers}
              placeholder="Select user(s)..."
            />
          </div>
          <div className="min-w-[180px]">
            <Dropdown3
              label="Secretary (Approver/Checker)"
              value={assignedSecretary}
              onChange={setAssignedSecretary}
              options={secretaries.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Select secretary..."
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
            disabled={!title || assignedUsers.length === 0 || !assignedSecretary}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
