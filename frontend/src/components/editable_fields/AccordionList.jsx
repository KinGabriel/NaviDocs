// src/components/editable_fields/accordionList.jsx
import React, { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit3, Check, X, Tag } from "lucide-react";
import TagPicker from "./TagPicker";
import { makeId } from "../../utils/ids";

export default function AccordionList({
  accordions = [],
  setAccordions = () => {},
  tagsRegistry = [],
  onInsertField = () => {},
  onRemoveField = () => {},
  onUpdateField = () => {},
  onSaveGroup = null,
  allowedScopes = ['user'],
  scopesByAccordion = {},
  onScopeChange = () => {},
  canSaveSchool = false,
  canSaveGlobal = false,
  onSyncGroup = null,
  onRenameGroup = null,
  onDeleteGroup = null,
}) {
  const [expanded, setExpanded] = useState({});
  const [editingAccordion, setEditingAccordion] = useState(null);
  const [newAccordionName, setNewAccordionName] = useState("");
  const [renaming, setRenaming] = useState({});
  const [renameDraft, setRenameDraft] = useState({});
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [newFieldData, setNewFieldData] = useState({ name: "", type: "text", placeholder: "", instructions: "" });

  const toggleAccordion = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addAccordion = () => {
    if (!newAccordionName.trim()) return;
    const newAcc = { id: makeId(), name: newAccordionName.trim(), fields: [] };
    setAccordions((prev) => [...prev, newAcc]);
    setNewAccordionName("");
  };

  const removeAccordion = (id) => {
    const acc = accordions.find((a) => a.id === id);
    if (acc && acc.isLocalOnly) return; // cannot remove local-only section
    if (!window.confirm("Remove this accordion and all its fields?")) return;
    setAccordions((prev) => prev.filter((a) => a.id !== id));
  };

  const addField = (accordionId) => {
    const field = {
      id: makeId(),
      name: newFieldData.name.trim() || "Untitled Field",
      type: newFieldData.type,
      placeholder: newFieldData.placeholder.trim() || "Enter value...",
      instructions: newFieldData.instructions.trim() || "",
      tags: [],
    };
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId ? { ...a, fields: [...a.fields, field] } : a
      )
    );
  setNewFieldData({ name: "", type: "text", placeholder: "", instructions: "" });
  };

  const removeField = (accordionId, fieldId) => {
    if (!window.confirm("Remove this field from template?")) return;
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId
          ? { ...a, fields: a.fields.filter((f) => f.id !== fieldId) }
          : a
      )
    );
    onRemoveField(fieldId);
  };

  const insertFieldToEditor = (field) => {
    onInsertField(field);
  };

  const updateTagsForField = (accordionId, fieldId, tags) => {
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId
          ? {
              ...a,
              fields: a.fields.map((f) =>
                f.id === fieldId ? { ...f, tags } : f
              ),
            }
          : a
      )
    );
    onUpdateField(fieldId, { tags });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newAccordionName}
          placeholder="Accordion name"
          onChange={(e) => setNewAccordionName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={addAccordion}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
        >
          + Add
        </button>
      </div>

      {accordions.map((acc) => (
        <div key={acc.id} className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div
            className="flex cursor-pointer items-center justify-between border-b border-slate-100 p-2 hover:bg-slate-50"
            onClick={() => toggleAccordion(acc.id)}
          >
            <div className="flex items-center gap-2">
              {expanded[acc.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {!renaming[acc.id] && (
                <span className="font-medium text-slate-800">{acc.name}</span>
              )}
              {renaming[acc.id] && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={renameDraft[acc.id] ?? acc.name}
                    onChange={(e) => setRenameDraft((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                  />
                  <button
                    className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white"
                    onClick={() => {
                      const newName = (renameDraft[acc.id] ?? acc.name).trim();
                      if (!newName) return;
                      if (onRenameGroup && acc.sourceKey) onRenameGroup(acc, newName);
                      setRenaming((prev) => ({ ...prev, [acc.id]: false }));
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    onClick={() => setRenaming((prev) => ({ ...prev, [acc.id]: false }))}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!acc.isLocalOnly && acc.sourceKey && !renaming[acc.id] && (
                (() => {
                  const scope = scopesByAccordion[acc.id] || allowedScopes[0];
                  const canModify = !(
                    (scope === 'school' && !canSaveSchool) || (scope === 'global' && !canSaveGlobal)
                  );
                  return canModify ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenaming((prev) => ({ ...prev, [acc.id]: true }));
                        setRenameDraft((prev) => ({ ...prev, [acc.id]: acc.name }));
                      }}
                      className="text-slate-600 hover:text-slate-800 text-xs underline"
                    >
                      Rename
                    </button>
                  ) : null;
                })()
              )}
              {!acc.isLocalOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAccordion(acc.id);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {expanded[acc.id] && (
            <div className="space-y-2 p-3">
              {acc.fields.length === 0 && (
                <div className="text-xs text-slate-500">No fields yet.</div>
              )}

              {acc.fields.map((f) => (
                <div
                  key={f.id}
                  className="rounded-md border border-slate-200 p-2 hover:bg-slate-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm text-slate-800">
                        {f.name}{" "}
                        <span className="text-slate-400 text-xs">
                          ({f.type})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Placeholder: <em>{f.placeholder}</em>
                      </div>
                      {f.instructions && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Instructions: <em>{f.instructions}</em>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => insertFieldToEditor(f)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Insert
                      </button>
                      {(() => {
                        const scope = scopesByAccordion[acc.id] || allowedScopes[0];
                        const canDelete = acc.isLocalOnly || (
                          (scope !== 'school' || canSaveSchool) &&
                          (scope !== 'global' || canSaveGlobal)
                        );
                        return canDelete ? (
                          <button
                            onClick={() => removeField(acc.id, f.id)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <TagPicker
                    availableTags={tagsRegistry}
                    selectedTags={f.tags}
                    onChange={(tags) => updateTagsForField(acc.id, f.id, tags)}
                  />
                </div>
              ))}

              <div className="mt-3 border-t border-slate-200 pt-3">
                {(onSaveGroup || onSyncGroup || onDeleteGroup) && !acc.isLocalOnly && (
                  <div className="mb-3 flex items-center justify-between gap-2">
                    {allowedScopes.includes((scopesByAccordion[acc.id] || allowedScopes[0])) && allowedScopes.length > 1 ? (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Scope</label>
                        <select
                          className="border rounded-md px-2 py-1 text-xs"
                          value={scopesByAccordion[acc.id] || allowedScopes[0]}
                          onChange={(e) => onScopeChange(acc.id, e.target.value)}
                        >
                          {allowedScopes.map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        Scope: <span className="capitalize font-medium text-slate-700">{scopesByAccordion[acc.id] || allowedScopes[0]}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                    {!(
                      (scopesByAccordion[acc.id] || allowedScopes[0]) === 'school' && !canSaveSchool
                    ) && !(
                      (scopesByAccordion[acc.id] || allowedScopes[0]) === 'global' && !canSaveGlobal
                    ) && (
                      <button
                        onClick={() => onSaveGroup(acc)}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        Save Section to Library
                      </button>
                    )}
                    {onSyncGroup && (
                      <button
                        onClick={() => onSyncGroup(acc)}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                        title="Fetch latest fields from library"
                      >
                        Sync from Library
                      </button>
                    )}
                    {onDeleteGroup && acc.sourceKey && !(
                      (scopesByAccordion[acc.id] || allowedScopes[0]) === 'school' && !canSaveSchool
                    ) && !(
                      (scopesByAccordion[acc.id] || allowedScopes[0]) === 'global' && !canSaveGlobal
                    ) && (
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this section from the library? This does not undo changes in other templates.')) {
                            onDeleteGroup(acc);
                          }
                        }}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        title="Delete this group from the library"
                      >
                        Delete from Library
                      </button>
                    )}
                    </div>
                  </div>
                )}
                {(acc.isLocalOnly || !(
                  (scopesByAccordion[acc.id] || allowedScopes[0]) === 'school' && !canSaveSchool
                ) && !(
                  (scopesByAccordion[acc.id] || allowedScopes[0]) === 'global' && !canSaveGlobal
                )) && (
                  <>
                    <div className="text-xs mb-1 text-slate-600 font-medium">
                      Add New Field
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={newFieldData.name}
                        onChange={(e) =>
                          setNewFieldData({ ...newFieldData, name: e.target.value })
                        }
                        className="col-span-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                      <select
                        value={newFieldData.type}
                        onChange={(e) =>
                          setNewFieldData({ ...newFieldData, type: e.target.value })
                        }
                        className="col-span-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="image">Image</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Placeholder"
                        value={newFieldData.placeholder}
                        onChange={(e) =>
                          setNewFieldData({
                            ...newFieldData,
                            placeholder: e.target.value,
                          })
                        }
                        className="col-span-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Instructions (optional)"
                        value={newFieldData.instructions}
                        onChange={(e) =>
                          setNewFieldData({
                            ...newFieldData,
                            instructions: e.target.value,
                          })
                        }
                        className="col-span-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <button
                      onClick={() => addField(acc.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      + Add Field
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
