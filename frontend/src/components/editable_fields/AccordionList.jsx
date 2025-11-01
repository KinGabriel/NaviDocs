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
}) {
  const [expanded, setExpanded] = useState({});
  const [editingAccordion, setEditingAccordion] = useState(null);
  const [newAccordionName, setNewAccordionName] = useState("");
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [newFieldData, setNewFieldData] = useState({ name: "", type: "text", placeholder: "" });

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
    if (!window.confirm("Remove this accordion and all its fields?")) return;
    setAccordions((prev) => prev.filter((a) => a.id !== id));
  };

  const addField = (accordionId) => {
    const field = {
      id: makeId(),
      name: newFieldData.name.trim() || "Untitled Field",
      type: newFieldData.type,
      placeholder: newFieldData.placeholder.trim() || "Enter value...",
      tags: [],
    };
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId ? { ...a, fields: [...a.fields, field] } : a
      )
    );
    setNewFieldData({ name: "", type: "text", placeholder: "" });
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
              <span className="font-medium text-slate-800">{acc.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeAccordion(acc.id);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </button>
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
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => insertFieldToEditor(f)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Insert
                      </button>
                      <button
                        onClick={() => removeField(acc.id, f.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
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
                <div className="text-xs mb-1 text-slate-600 font-medium">
                  Add New Field
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
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
                </div>
                <button
                  onClick={() => addField(acc.id)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                >
                  + Add Field
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
