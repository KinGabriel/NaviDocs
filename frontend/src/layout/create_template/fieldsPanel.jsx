// src/layout/create_template/fieldsPanel.jsx
import React, { useState, useMemo, useEffect } from "react";
import useUser from "../../hooks/useUser";
import AccordionList from "../../components/editable_fields/accordionList";
import TagsManager from "../../components/editable_fields/tagsManager";
import { listTagsAPI } from "../../api/tagsAPI";

/**
 * FieldsPanel — Enhanced panel with:
 * - Tabbed interface: Editable Fields | Tags
 * - Accordion grouping for fields
 * - Per-field tag selection and tag registry management
 * - Full sync with the text editor for insert/remove actions
 */

export default function FieldsPanel({ editor, fields = [], onChange = () => {} }) {
  const user = useUser();
  const [activeTab, setActiveTab] = useState("fields"); // "fields" | "tags"
  const [accordions, setAccordions] = useState(() => [
    { id: `acc-${Date.now()}`, name: "Section 1", fields: [] },
  ]);
  const [tagsRegistry, setTagsRegistry] = useState([]);
  const [recentTags, setRecentTags] = useState([]);

  // hydrate from persisted fields prop with loop-guard
  const lastHydratedRef = React.useRef("");
  const stableStringify = (obj) => {
    try {
      return JSON.stringify(obj);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    try {
      if (!fields || !Array.isArray(fields) || fields.length === 0) return; // keep default when empty
      const incoming =
        fields[0] && fields[0].fields
          ? fields
          : [{ id: `acc-${Date.now()}`, name: "Section 1", fields }];

      const incomingStr = stableStringify(incoming);
      if (incomingStr === lastHydratedRef.current) return; // no change

      setAccordions(incoming);
      lastHydratedRef.current = incomingStr;
    } catch {}
  }, [fields]);

  // Load tags registry and recent tags from backend
  useEffect(() => {
    (async () => {
      try {
        const [all, recent] = await Promise.all([
          listTagsAPI({ limit: 500 }),
          listTagsAPI({ recent: 1, limit: 12 }),
        ]);
        const reg = (all || []).map((t) => ({
          id: t.key,
          name: t.label,
          color: t.color || "#7e57c2",
          last_used: t.last_used,
        }));
        setTagsRegistry(reg);
        setRecentTags(
          (recent || []).map((t) => ({
            id: t.key,
            name: t.label,
            color: t.color || "#7e57c2",
            last_used: t.last_used,
          }))
        );
      } catch (e) {
        console.warn("Failed to load tags registry", e);
      }
    })();
  }, []);

  // --- Derived values --------------------------------------------------------
  const allFields = useMemo(() => accordions.flatMap((a) => a.fields), [accordions]);
  const getTagUsageCount = (tagId) =>
    allFields.filter((f) => f.tags?.includes(tagId)).length;

  // Serialize accordions to the persisted structure expected in template.fields
  const serialize = React.useCallback(() => {
    const colorById = new Map(
      (tagsRegistry || []).map((t) => [t.id, t.color || "#7e57c2"])
    );
    return accordions.map(({ id, name, fields }) => ({
      id,
      name,
      fields: (fields || []).map(
        ({
          id: fid,
          name,
          type,
          placeholder,
          tags,
          instructions,
          dateFormat,
        }) => {
          const tagColors = {};
          if (Array.isArray(tags)) {
            for (const tid of tags) {
              const c = colorById.get(tid);
              if (c) tagColors[tid] = c;
            }
          }
          return {
            id: fid,
            name,
            type,
            placeholder,
            instructions,
            tags,
            tagColors,
            ...(dateFormat ? { dateFormat } : {}),
          };
        }
      ),
    }));
  }, [accordions, tagsRegistry]);

  // derive recent tags based on current template usage, merged with backend recents
  useEffect(() => {
    try {
      const counts = new Map();
      for (const f of allFields) {
        for (const t of f.tags || []) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
      const localRecents = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      const byId = new Map(tagsRegistry.map((t) => [t.id, t]));
      const mergedIds = [];
      for (const id of localRecents) if (byId.has(id)) mergedIds.push(id);
      for (const t of recentTags) if (!mergedIds.includes(t.id)) mergedIds.push(t.id);
      const merged = mergedIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .slice(0, 12);
      if (merged.length) setRecentTags(merged);
    } catch {}
  }, [accordions, tagsRegistry]);

  // --- Field sync with editor ------------------------------------------------
  const handleInsertField = (field) => {
    if (!editor || !field) return;

    const key = field.id || field.key;
    if (!key) return;

    const type = field.type || "text";

    let placeholder =
      (field.placeholder && String(field.placeholder).trim()) || "";

    // Fallback placeholder logic per type
    if (!placeholder) {
      if (type === "date") {
        const df = field.dateFormat || "YYYY-MM-DD";
        placeholder = df;
      } else if (type === "image") {
        placeholder = "Upload image";
      } else {
        placeholder =
          (field.name && String(field.name).trim()) || "Enter value...";
      }
    }

    const baseAttrs = {
      key,
      type,
      placeholder,
      tags: Array.isArray(field.tags) ? field.tags : [],
    };

    if (type === "date" && field.dateFormat) {
      baseAttrs.dateFormat = field.dateFormat;
    }

    // Image fields now go through EditableField as well.
    // If later you want to bind actual imageSrc/width/height,
    // you can extend this branch to include those attrs.
    editor
      .chain()
      .focus()
      .insertEditableField(baseAttrs)
      .run();
  };

  const handleRemoveField = (fieldId) => {
    if (!editor) return;
    const { state, view } = editor;

    const ranges = [];
    state.doc.descendants((node, pos) => {
      if (node.type && node.type.name === "editableField" && node.attrs?.key === fieldId) {
        ranges.push({ from: pos, to: pos + node.nodeSize });
      }
    });
    if (ranges.length === 0) return;

    const tr = state.tr;
    ranges
      .sort((a, b) => b.from - a.from)
      .forEach((r) => {
        try {
          tr.delete(r.from, r.to);
        } catch (_) {
          try {
            const from = tr.mapping.map(r.from);
            const to = tr.mapping.map(r.to);
            if (to > from) tr.delete(from, to);
          } catch (_) {
            /* ignore */
          }
        }
      });

    if (tr.docChanged) view.dispatch(tr);
    view.focus();
  };

  const handleUpdateField = (fieldId, updates) => {
    setAccordions((prev) =>
      prev.map((acc) => ({
        ...acc,
        fields: acc.fields.map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f
        ),
      }))
    );
  };

  // --- Persistence -----------------------------------------------------------
  const persistAll = () => {
    const colorById = new Map(
      (tagsRegistry || []).map((t) => [t.id, t.color || "#7e57c2"])
    );
    const serialized = accordions.map(({ id, name, fields }) => ({
      id,
      name,
      fields: fields.map(
        ({
          id: fid,
          name,
          type,
          placeholder,
          tags,
          instructions,
          dateFormat,
        }) => {
          const tagColors = {};
          if (Array.isArray(tags)) {
            for (const tid of tags) {
              const c = colorById.get(tid);
              if (c) tagColors[tid] = c;
            }
          }
          return {
            id: fid,
            name,
            type,
            placeholder,
            instructions,
            tags,
            tagColors,
            ...(dateFormat ? { dateFormat } : {}),
          };
        }
      ),
    }));
    onChange(serialized);
  };

  // --- Render ---------------------------------------------------------------
  return (
    <div className="space-y-3">
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab("fields")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === "fields"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Editable Fields
        </button>
        <button
          onClick={() => setActiveTab("tags")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === "tags"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tags
        </button>
      </div>

      {activeTab === "fields" && (
        <div className="p-2 space-y-3">
          <AccordionList
            accordions={accordions}
            setAccordions={setAccordions}
            tagsRegistry={tagsRegistry}
            onInsertField={handleInsertField}
            onRemoveField={handleRemoveField}
            onUpdateField={handleUpdateField}
          />

          <div className="flex justify-end">
            <button
              onClick={() => onChange(serialize())}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              Save All Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === "tags" && (
        <div className="p-2 space-y-3">
          <div>
            <div className="text-xs mb-1 text-slate-600 font-medium">Recently used</div>
            <div className="flex flex-wrap gap-1.5">
              {recentTags.length === 0 && (
                <div className="text-xs text-slate-500">No recent tags yet.</div>
              )}
              {recentTags.map((t) => (
                <span
                  key={`recent-${t.id}`}
                  className="rounded-full border border-slate-300 px-2 py-0.5 text-xs"
                  title={t.name}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>

          <TagsManager
            tags={tagsRegistry}
            setTags={setTagsRegistry}
            getUsageCount={getTagUsageCount}
          />
        </div>
      )}
    </div>
  );
}
