// src/components/editable_fields/tagPicker.jsx
import React, { useState } from "react";
import { Plus, X } from "lucide-react";

export default function TagPicker({
  availableTags = [],
  selectedTags = [],
  onChange = () => {},
}) {
  const [open, setOpen] = useState(false);

  const toggleTag = (id) => {
    if (selectedTags.includes(id)) {
      onChange(selectedTags.filter((t) => t !== id));
    } else {
      onChange([...selectedTags, id]);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((id) => {
          const tag = availableTags.find((t) => t.id === id);
          if (!tag) return null;
          return (
            <div
              key={id}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => toggleTag(id)}
                className="ml-1 text-white/80 hover:text-white"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50"
        >
          <Plus size={12} /> Tag
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 shadow-md">
          {availableTags.length === 0 && (
            <div className="text-xs text-slate-500">No tags available</div>
          )}
          {availableTags.map((tag) => (
            <div
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs hover:bg-slate-50 ${
                selectedTags.includes(tag.id)
                  ? "bg-slate-100 font-medium"
                  : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                ></span>
                {tag.name}
              </span>
              {selectedTags.includes(tag.id) && <X size={12} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
