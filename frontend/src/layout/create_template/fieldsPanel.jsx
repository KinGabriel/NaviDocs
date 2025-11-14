import React, { useState, useMemo, useEffect } from "react";
import useUser from "../../hooks/useUser";
import AccordionList from "../../components/editable_fields/AccordionList";
import TagsManager from "../../components/editable_fields/tagsManager";
import { listTagsAPI } from "../../api/tagsAPI";
import {
  upsertFieldGroupToLibraryAPI,
  listFieldGroupLibraryAPI,
} from "../../api/fieldGroupLibraryAPI";
import GroupBrowserModal2 from "../../components/modals/groupBrowserModal";
import toast from "react-hot-toast";

/**
 * FieldsPanel — Enhanced panel with:
 * - Tabbed interface: Editable Fields | Tags
 * - Accordion grouping for fields
 * - Per-group font settings (font, size, bold, italic, color)
 * - Per-field tag selection and tag registry management
 * - Full sync with the text editor for insert/remove actions
 */

export default function FieldsPanel({ editor, fields = [], onChange = () => { } }) {
  const user = useUser();
  const [activeTab, setActiveTab] = useState("fields"); // "fields" | "tags"
  const [accordions, setAccordions] = useState(() => [
    {
      id: `acc-${Date.now()}`,
      name: "Section 1",
      fields: [],
      // style is managed inside AccordionList; leave undefined here
    },
  ]);
  const [tagsRegistry, setTagsRegistry] = useState([]);
  const [recentTags, setRecentTags] = useState([]);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [savedGroups, setSavedGroups] = useState([]);
  const [loadingSavedGroups, setLoadingSavedGroups] = useState(false);
  const [selectedSavedGroup, setSelectedSavedGroup] = useState(null);
  const [groupBrowserOpen, setGroupBrowserOpen] = useState(false);

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
          ? fields // already grouped: [{ id, name, fields, style? }]
          : [
            {
              id: `acc-${Date.now()}`,
              name: "Section 1",
              fields,
            },
          ];

      const incomingStr = stableStringify(incoming);
      if (incomingStr === lastHydratedRef.current) return; // no change

      setAccordions(incoming);
      lastHydratedRef.current = incomingStr;
    } catch {
    }
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

  // Derived values 
  const allFields = useMemo(
    () => accordions.flatMap((a) => a.fields || []),
    [accordions]
  );
  const getTagUsageCount = (tagId) =>
    allFields.filter((f) => f.tags?.includes(tagId)).length;

  // Serialize accordions to the persisted structure expected in template.fields
  const serialize = React.useCallback(() => {
    const colorById = new Map(
      (tagsRegistry || []).map((t) => [t.id, t.color || "#7e57c2"])
    );
    return accordions.map(({ id, name, fields, style }) => ({
      id,
      name,
      // persist group-level font style with the template
      style: style || null,
      fields: (fields || []).map(
        ({
          id: fid,
          name: fieldName,
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
            // keep both name and label for compatibility; label is used by documents/editable fields
            label: fieldName,
            name: fieldName,
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
    } catch {
    }
  }, [accordions, tagsRegistry]);

  // Field sync with editor 
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

    // Date-specific attribute
    if (type === "date" && field.dateFormat) {
      baseAttrs.dateFormat = field.dateFormat;
    }

    // Group + font style coming from AccordionList
    if (field.groupId) {
      baseAttrs.groupId = field.groupId;
    }
    if (field.fontStyle && typeof field.fontStyle === "object") {
      const { fontFamily, fontSize, bold, italic, color } = field.fontStyle;
      if (fontFamily) baseAttrs.fontFamily = fontFamily;
      if (typeof fontSize === "number" && fontSize > 0) {
        baseAttrs.fontSize = fontSize;
      }
      if (typeof bold === "boolean") baseAttrs.bold = bold;
      if (typeof italic === "boolean") baseAttrs.italic = italic;
      if (color) baseAttrs.color = color;
    }

    editor.chain().focus().insertEditableField(baseAttrs).run();
  };

  const handleRemoveField = (fieldId) => {
    if (!editor) return;
    const { state, view } = editor;

    const ranges = [];
    state.doc.descendants((node, pos) => {
      if (
        node.type &&
        node.type.name === "editableField" &&
        node.attrs?.key === fieldId
      ) {
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
          } catch {
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
        fields: (acc.fields || []).map((f) =>
          f.id === fieldId ? { ...f, ...updates } : f
        ),
      }))
    );
  };

  // Persistence 
  const persistAll = () => {
    const colorById = new Map(
      (tagsRegistry || []).map((t) => [t.id, t.color || "#7e57c2"])
    );
    const serialized = accordions.map(({ id, name, fields, style }) => ({
      id,
      name,
      style: style || null,
      fields: (fields || []).map(
        ({
          id: fid,
          name: fieldName,
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
            label: fieldName,
            name: fieldName,
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

  const insertSavedGroup = (group) => {
    if (!group) return;

    // Disallow inserting a group with the same name as an existing accordion in this template
    try {
      const name = (group.label || group.key || "").trim();
      if (name) {
        const exists = accordions.some(
          (a) =>
            ((a.name || "") + "")
              .trim()
              .toLowerCase() === name.toLowerCase()
        );
        if (exists) {
          toast("A section with this name already exists in this template.", {
            icon: "ℹ️",
          });
          const match = (savedGroups || []).find(
            (g) =>
              ((g.label || g.key || "") + "")
                .trim()
                .toLowerCase() === name.toLowerCase()
          );
          if (match) setSelectedSavedGroup(match);
          return;
        }
      }
    } catch {
    }

    const mappedFields = (group.fields || []).map((f) => ({
      id: f.key || f.id || f._id || `fld-${Date.now().toString(36)}`,
      // preserve label (used by documents) and name for editor compatibility
      label: f.label || f.name || f.key,
      name: f.label || f.name || f.key,
      type: f.type || "text",
      placeholder: f.placeholder || "",
      tags: Array.isArray(f.tags) ? f.tags : [],
      instructions: f.instructions || "",
    }));

    const newAccordion = {
      id: `acc-${Date.now().toString(36)}`,
      name: group.label || group.key || `Saved Section`,
      fields: mappedFields,
      // no style stored at library level yet; AccordionList will normalize defaults
    };

    setAccordions((prev) => [...prev, newAccordion]);
    toast.success("Inserted saved section into template");
  };

  // Fast save directly from accordion - no modal
  const handleFastSaveGroup = async (acc) => {
    if (!user || !(user._id || user.id)) {
      toast.error("You must be signed in to save a section.");
      return;
    }
    if (!acc || !acc.name) {
      toast.error("Group must have a name.");
      return;
    }

    let keyToUse = null;
    let overwriteMessage = null;
    try {
      const nameNorm = (acc.name || "").trim().toLowerCase();
      const localExisting = (savedGroups || []).find(
        (g) =>
          ((g.label || g.key || "") + "")
            .trim()
            .toLowerCase() === nameNorm
      );
      if (localExisting) {
        keyToUse = localExisting.key || localExisting.id;
        overwriteMessage =
          "A saved section with this name exists — it will be overwritten.";
        setSelectedSavedGroup(localExisting);
      }

      try {
        const params = {
          scope: "user",
          owner: user._id || user.id,
          search: acc.name,
        };
        const serverList = await listFieldGroupLibraryAPI(params);
        const serverExisting = (serverList || []).find(
          (g) =>
            ((g.label || g.key || "") + "")
              .trim()
              .toLowerCase() === nameNorm
        );
        if (serverExisting) {
          keyToUse = serverExisting.key || serverExisting.id || keyToUse;
          overwriteMessage =
            "A saved section on the server with this name exists — it will be overwritten.";
          setSelectedSavedGroup(serverExisting);
          setSavedGroups((prev) => {
            const filtered = (prev || []).filter(
              (pg) =>
                (pg.key || pg.id) !==
                (serverExisting.key || serverExisting.id)
            );
            return [serverExisting, ...filtered];
          });
        }
      } catch (e) {
        console.warn("Failed to verify existing groups on server:", e);
      }

      if (overwriteMessage) {
        toast(overwriteMessage, { icon: "ℹ️" });
      }
    } catch {
    }

    const fieldsToSave = (acc.fields || []).map((f) => ({
      id: f.id || f.key || f._id,
      key: f.id || f.key || f._id,
      label: f.name || f.label || f.key,
      type: f.type || "text",
      placeholder: f.placeholder || "",
      tags: Array.isArray(f.tags) ? f.tags : [],
      instructions: f.instructions || "",
    }));

    const normalizedKey =
      (acc.name || "section")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Date.now().toString(36).slice(-6);

    const keyToSend = keyToUse || normalizedKey;

    const payload = {
      key: keyToSend,
      label: acc.name,
      scope: "user",
      owner: user._id || user.id,
      fields: fieldsToSave,
    };

    try {
      setIsSavingGroup(true);
      const returned = await upsertFieldGroupToLibraryAPI(payload);
      if (returned) {
        setSavedGroups((prev) => {
          const filtered = (prev || []).filter(
            (g) => (g.key || g.id) !== (returned.key || returned.id)
          );
          return [returned, ...filtered];
        });
        setSelectedSavedGroup(returned);
      }
      toast.success("Section saved to your library.");
    } catch (e) {
      console.error("Fast save failed:", e);
      toast.error("Failed to save section.");
    } finally {
      setIsSavingGroup(false);
      try {
        await loadSavedGroups();
      } catch {
      }
    }
  };

  // Load user's saved groups
  const loadSavedGroups = async () => {
    if (!user || !(user._id || user.id)) return;
    setLoadingSavedGroups(true);
    try {
      const params = { scope: "user", owner: user._id || user.id };
      const groups = await listFieldGroupLibraryAPI(params);
      setSavedGroups(Array.isArray(groups) ? groups : []);
      setSelectedSavedGroup(
        (g) => g || (Array.isArray(groups) && groups[0]) || null
      );
    } catch (e) {
      console.error("Failed to load saved groups:", e);
    } finally {
      setLoadingSavedGroups(false);
    }
  };

  useEffect(() => {
    loadSavedGroups();
  }, [user?._id, user?.id]);

  // Render 
  return (
    <div className="space-y-3">
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab("fields")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === "fields"
            ? "border-b-2 border-indigo-600 text-indigo-700"
            : "text-slate-500 hover:text-slate-700"
            }`}
        >
          Editable Fields
        </button>
        <button
          onClick={() => setActiveTab("tags")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${activeTab === "tags"
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
            onSaveGroup={(acc) => handleFastSaveGroup(acc)}
            isSignedIn={!!(user && (user._id || user.id))}
            onBrowse={() => setGroupBrowserOpen(true)}
          />

          <GroupBrowserModal2
            open={groupBrowserOpen}
            onClose={() => setGroupBrowserOpen(false)}
            onInsert={(g) => {
              insertSavedGroup(g);
              setGroupBrowserOpen(false);
            }}
          />

          {/* My Saved Sections */}
          <div className="mt-4 p-3 border rounded bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">My Saved Sections</div>
              <div className="text-xs text-slate-500">
                {loadingSavedGroups ? "Loading…" : `${savedGroups.length} saved`}
              </div>
            </div>
            {savedGroups.length === 0 ? (
              <div className="text-xs text-slate-500">
                You have no saved sections yet. Use "Save Section" to add one.
              </div>
            ) : (
              <div className="space-y-2">
                {savedGroups.map((g, i) => (
                  <div
                    key={g.key || g.id || i}
                    className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-slate-100"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {g.label || g.key}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {(g.fields || [])
                          .slice(0, 3)
                          .map((f) => f.label || f.key)
                          .join(", ")}
                        {(g.fields || []).length > 3 ? " …" : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => insertSavedGroup(g)}
                        className="text-xs rounded-md bg-indigo-600 text-white px-2 py-1"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedSavedGroup && (
              <div className="mt-3 p-2 border-t">
                <div className="text-xs text-slate-500 mb-1">
                  Preview: {selectedSavedGroup.label || selectedSavedGroup.key}
                </div>
                <div className="space-y-1 text-[13px]">
                  {(selectedSavedGroup.fields || []).map((f, idx) => (
                    <div
                      key={f.key || f.id || idx}
                      className="text-slate-700"
                    >
                      • {f.label || f.key}{" "}
                      <span className="text-xs text-slate-400">
                        ({f.type || "text"})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
            <div className="text-xs mb-1 text-slate-600 font-medium">
              Recently used
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentTags.length === 0 && (
                <div className="text-xs text-slate-500">
                  No recent tags yet.
                </div>
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