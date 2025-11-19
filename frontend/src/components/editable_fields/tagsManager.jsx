import React, { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { listTagsAPI, upsertTagAPI, deleteTagAPI } from "../../api/tagsAPI";

export default function TagsManager({
  tags = [],
  setTags = () => { },
  getUsageCount = () => 0,
}) {
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#7e57c2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const items = await listTagsAPI();
        // Normalize: id = key, name = label
        const reg = (items || []).map((t) => ({ id: t.key, name: t.label, color: t.color || "#7e57c2" }));
        setTags(reg);
      } catch (e) {
        setError(e?.message || "Failed to load tags");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addTag = async () => {
    if (!newTagName.trim()) return;
    const key = newTagName.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
    try {
      const saved = await upsertTagAPI({ key, label: newTagName.trim(), color: newTagColor });
      const tag = { id: saved.key, name: saved.label, color: saved.color || newTagColor };
      setTags((prev) => {
        const existing = prev.find((t) => t.id === tag.id);
        if (existing) return prev.map((t) => (t.id === tag.id ? tag : t));
        return [...prev, tag];
      });
      setNewTagName("");
    } catch (e) {
      setError(e?.message || "Failed to save tag");
    }
  };

  const removeTag = async (id) => {
    const count = getUsageCount(id);
    if (count > 0) {
      if (!window.confirm(`Tag is used by ${count} fields. Remove anyway?`)) return;
    }
    try {
      await deleteTagAPI(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e?.message || 'Failed to delete tag');
    }
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

      {error && <div className="text-xs text-red-600">{error}</div>}
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