import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import TagSelectModal from "../modals/tagSelectModal";

export default function TagPicker({
  availableTags = [],
  selectedTags = [],
  onChange = () => { },
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
              key={`tagchip-${String(id)}`}
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

      <TagSelectModal
        open={open}
        onClose={() => setOpen(false)}
        tags={availableTags}
        selected={selectedTags}
        onApply={(ids) => { onChange(ids); setOpen(false); }}
      />
    </div>
  );
}