// src/components/editable_fields/tagsManager.jsx
import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { makeId } from "../../utils/ids";

export default function TagsManager({
  tags = [],
  setTags = () => {},
  getUsageCount = () => 0,
}) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#7e57c2");

  const addTag = () => {
    if (!newTagName.trim()) return;
    const tag = { id: makeId(), name: newTagName.trim(), color: newTagColor };
    setTags((prev) => [...prev, tag]);
    setNewTagName("");
  };

  const removeTag = (id) => {
    const count = getUsageCount(id);
    if (count > 0) {
      if (!window.confirm(`Tag is used by ${count} fields. Remove anyway?`)) return;
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTagName}
          placeholder="Tag name"
          onChange={(e) => setNewTagName(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-300"
        />
        <button
          onClick={addTag}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {tags.length === 0 && (
          <div className="text-sm text-slate-500">No tags yet.</div>
        )}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-2 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.color }}
              ></span>
              <span className="text-sm text-slate-700">{tag.name}</span>
              <span className="text-xs text-slate-400">
                ({getUsageCount(tag.id)} uses)
              </span>
            </div>
            <button
              onClick={() => removeTag(tag.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
