// src/layout/create_template/fieldsPanel.jsx
import React, { useState, useMemo, useEffect } from "react";
import useUser from "../../hooks/useUser";
import AccordionList from "../../components/editable_fields/accordionList";
import TagsManager from "../../components/editable_fields/tagsManager";
import { listFieldGroupLibraryAPI, bulkUpsertFieldGroupsToLibraryAPI, upsertFieldGroupToLibraryAPI, getFieldGroupByKeyAPI, deleteFieldGroupFromLibraryAPI, renameFieldGroupInLibraryAPI } from "../../api/fieldGroupLibraryAPI";
import GroupBrowserModal from "../../components/modals/groupBrowserModal";

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
    { id: "acc-local", name: "Local Fields", isLocalOnly: true, fields: [] },
  ]);
  const [tagsRegistry, setTagsRegistry] = useState([]);
  const [groupLibrary, setGroupLibrary] = useState([]);
  const [selectedLibKey, setSelectedLibKey] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Determine allowed scopes based on role
  const roleName = useMemo(() => {
    const r = user?.role;
    return typeof r === 'string' ? r : (r?.name || "");
  }, [user]);
  const isDeanOrSecretary = roleName === 'Dean' || roleName === 'Secretary';
  const isDocumentController = roleName === 'Document Controller';
  // Allowed scopes based on role
  const allowedScopes = useMemo(() => {
    if (roleName === 'Document Controller') return ['global', 'user'];
    if (roleName === 'Dean' || roleName === 'Secretary') return ['user', 'school'];
    return ['user'];
  }, [roleName]);

  // Per-accordion selected scopes for saving; defaults based on role
  const [scopesByAccordion, setScopesByAccordion] = useState({});
  useEffect(() => {
    // Reconcile scopes map when accordions or role change
    setScopesByAccordion((prev) => {
      const next = { ...prev };
      let changed = false;
      // Ensure each accordion has a scope; don't override existing value even if not allowed.
      for (const acc of accordions) {
        if (!next[acc.id]) {
          next[acc.id] = allowedScopes[0];
          changed = true;
        }
      }
      // Remove scopes for deleted accordions
      for (const id of Object.keys(next)) {
        if (!accordions.some((a) => a.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [accordions, allowedScopes]);

  // hydrate from persisted fields prop
  useEffect(() => {
    try {
      if (!fields || !Array.isArray(fields)) return;
      // Accept either array of accordions or flat fields array
      if (fields.length > 0 && fields[0] && fields[0].fields) {
        // Normalize local-only section: ensure exactly one, even if older saves lacked the isLocalOnly flag
        let arr = [...fields];
        const localIdxs = arr.reduce((acc, a, i) => {
          const isNamedLocal = String(a.name || '').toLowerCase() === 'local fields';
          if (a.isLocalOnly || (isNamedLocal && !a.sourceKey)) acc.push(i);
          return acc;
        }, []);
        if (localIdxs.length === 0) {
          arr = [{ id: 'acc-local', name: 'Local Fields', isLocalOnly: true, fields: [] }, ...arr];
        } else {
          const keep = localIdxs[0];
          arr = arr.filter((_, i) => i === keep || !localIdxs.includes(i));
          // Ensure the kept one is marked local-only
          arr[keep === 0 ? 0 : arr.findIndex((_, i) => i === keep)] = {
            ...arr[keep === 0 ? 0 : arr.findIndex((_, i) => i === keep)],
            isLocalOnly: true,
          };
        }
        setAccordions(arr);
        // Hydrate saved scopes per section if present
        const savedScopes = {};
        for (const a of arr) {
          if (a && a.id && a.scope) savedScopes[a.id] = a.scope;
        }
        if (Object.keys(savedScopes).length) {
          setScopesByAccordion((prev) => ({ ...prev, ...savedScopes }));
        }
      } else if (fields.length > 0) {
        setAccordions([
          { id: "acc-local", name: "Local Fields", isLocalOnly: true, fields: [] },
          { id: `acc-${Date.now()}`, name: "Imported", fields: fields },
        ]);
      }
    } catch {}
  }, [fields]);

  // load reusable group library (sections)
  useEffect(() => {
    refreshGroups();
  }, []);

  // Previously supported auto/foreground refresh; simplified per request.

  const refreshGroups = async () => {
    try {
      const groups = await listFieldGroupLibraryAPI();
      setGroupLibrary(groups || []);
      // After fetching latest library, auto-sync any accordions inserted from library (by sourceKey)
      const scopeUpdates = [];
      setAccordions((prev) => {
        if (!Array.isArray(groups) || groups.length === 0) return prev;
        const byKey = new Map(groups.map((g) => [g.key, g]));
        let changed = false;
        const next = prev.map((acc) => {
          if (!acc.sourceKey) return acc;
          const lib = byKey.get(acc.sourceKey);
          if (!lib) return acc;
          // Update scope to match current group config
          if (lib.scope && (scopesByAccordion[acc.id] !== lib.scope)) {
            scopeUpdates.push([acc.id, lib.scope]);
          }
          // If label changed in library, update the section name
          let nameChanged = false;
          let newName = acc.name;
          if (lib.label && lib.label !== acc.name) {
            newName = lib.label;
            nameChanged = true;
          }
          const existingIds = new Set((acc.fields || []).map((f) => f.id || f.key));
          const toAppend = (lib.fields || []).filter((f) => !existingIds.has(f.key));
          if (toAppend.length === 0 && !nameChanged && !(lib.scope && lib.scope !== acc.scope)) return acc;
          changed = true;
          const updated = {
            ...acc,
            // persist scope from library if provided
            ...(lib.scope ? { scope: lib.scope } : {}),
            fields: [
              ...(acc.fields || []),
              ...toAppend.map((f) => ({
                id: f.key,
                name: f.label || f.key,
                type: f.type || 'text',
                placeholder: f.placeholder || '',
                instructions: f.instructions || '',
                tags: Array.isArray(f.tags) ? f.tags : [],
              })),
            ],
          };
          if (nameChanged) updated.name = newName;
          return updated;
        });
        return changed ? next : prev;
      });
      if (scopeUpdates.length) {
        setScopesByAccordion((prev) => {
          const out = { ...prev };
          for (const [id, sc] of scopeUpdates) out[id] = sc;
          return out;
        });
      }
      try { console.info('[FieldsPanel] Loaded sections from library:', (groups || []).length); } catch {}
    } catch (e) {
      console.warn("Failed to load section library", e);
    }
  };
  // helper: sync one accordion from library
  const syncOneAccordion = async (acc) => {
    const scope = scopesByAccordion[acc.id];
    const key = acc.sourceKey || slug(acc.name);
    if (!key) return;
    const lib = await getFieldGroupByKeyAPI(key, scope);
    if (!lib) return;
    setAccordions((prev) => prev.map((a) => {
      if (a.id !== acc.id) return a;
      // merge: update existing by key, append new; keep order
      const byKey = new Map((a.fields || []).map((f) => [f.id || f.key, { ...f }]));
      // update existing
      for (const f of (lib.fields || [])) {
        const k = f.key;
        if (byKey.has(k)) {
          const cur = byKey.get(k);
          byKey.set(k, {
            ...cur,
            name: f.label || k,
            type: f.type || cur.type || 'text',
            placeholder: f.placeholder ?? cur.placeholder ?? '',
            instructions: f.instructions ?? cur.instructions ?? '',
          });
        }
      }
      const existingOrder = (a.fields || []).map((f) => f.id || f.key);
      const mergedList = [];
      const seen = new Set();
      for (const k of existingOrder) {
        const v = byKey.get(k);
        if (v) { mergedList.push(v); seen.add(k); }
      }
      for (const f of (lib.fields || [])) {
        const k = f.key;
        if (!seen.has(k)) {
          mergedList.push({
            id: k,
            name: f.label || k,
            type: f.type || 'text',
            placeholder: f.placeholder || '',
            instructions: f.instructions || '',
            tags: Array.isArray(f.tags) ? f.tags : [],
          });
        }
      }
  const updated = { ...a, fields: mergedList, sourceKey: key };
      // If label changed in library, update the section name
  if (lib.label && lib.label !== a.name) updated.name = lib.label;
  if (lib.scope) updated.scope = lib.scope;
      return updated;
    }));
    if (lib.scope) {
      setScopesByAccordion((prev) => ({ ...prev, [acc.id]: lib.scope }));
    }
  };

  const slug = (v) => (v || '').toString().toLowerCase().trim().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');

  // --- Derived values --------------------------------------------------------
  const allFields = useMemo(() => accordions.flatMap((a) => a.fields), [accordions]);
  const getTagUsageCount = (tagId) => {
    return allFields.filter((f) => f.tags?.includes(tagId)).length;
  };

  // --- Field sync with editor ------------------------------------------------
  const handleInsertField = (field) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertEditableField({
        key: field.id || field.key,
        type: field.type,
        placeholder: field.placeholder,
      })
      .run();
  };

  const handleRemoveField = (fieldId) => {
    if (!editor) return;
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "editableField" && node.attrs.key === fieldId) {
        tr.delete(pos, pos + node.nodeSize);
      }
    });
    view.dispatch(tr);
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
    const serialized = accordions.map(({ id, name, fields, sourceKey, isLocalOnly, scope }) => ({
      id,
      name,
      sourceKey,
      isLocalOnly: !!isLocalOnly,
      scope: scopesByAccordion[id] || scope,
      fields: fields.map(({ id: fid, name, type, placeholder, tags, instructions }) => ({
        id: fid,
        name,
        type,
        placeholder,
        instructions,
        tags,
      })),
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
          {/* Library quick insert */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="shrink-0 rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700"
              onClick={() => setShowGroupModal(true)}
            >
              Browse Library
            </button>
            <button
              type="button"
              className="rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700"
              onClick={async () => {
                const list = accordions.filter((a) => !a.isLocalOnly);
                for (const acc of list) {
                  try { await syncOneAccordion(acc); } catch {}
                }
              }}
            >
              Sync All Sections
            </button>
          </div>

          <GroupBrowserModal
            open={showGroupModal}
            onClose={() => setShowGroupModal(false)}
            onInsert={(grp) => {
              if (!grp) return;
              const newId = `acc-${Date.now()}`;
              setAccordions((prev) => [
                ...prev,
                {
                  id: newId,
                  sourceKey: grp.key,
                  name: grp.label || grp.key,
                  scope: grp.scope || allowedScopes[0],
                  fields: (grp.fields || []).map((f) => ({
                    id: f.key,
                    name: f.label || f.key,
                    type: f.type || 'text',
                    placeholder: f.placeholder || '',
                    instructions: f.instructions || '',
                    tags: Array.isArray(f.tags) ? f.tags : [],
                  })),
                },
              ]);
              setScopesByAccordion((prev) => ({ ...prev, [newId]: grp.scope || allowedScopes[0] }));
            }}
          />

          <AccordionList
            accordions={accordions}
            setAccordions={setAccordions}
            tagsRegistry={tagsRegistry}
            onInsertField={handleInsertField}
            onRemoveField={handleRemoveField}
            onUpdateField={handleUpdateField}
            allowedScopes={allowedScopes}
            scopesByAccordion={scopesByAccordion}
            canSaveSchool={isDeanOrSecretary}
            canSaveGlobal={isDocumentController}
            onRenameGroup={async (acc, newName) => {
              try {
                if (!acc || !acc.sourceKey) return;
                const scope = scopesByAccordion[acc.id] || allowedScopes[0];
                const lib = await getFieldGroupByKeyAPI(acc.sourceKey, scope);
                if (!lib || !lib._id) return;
                await renameFieldGroupInLibraryAPI(lib._id, newName);
                await refreshGroups();
                // reflect in current template: update all sections referencing this group key
                setAccordions((prev) => prev.map((a) => a.sourceKey === acc.sourceKey ? { ...a, name: newName } : a));
              } catch (e) {
                console.warn('Failed to rename section in library', e);
              }
            }}
            onDeleteGroup={async (acc) => {
              try {
                if (!acc || !acc.sourceKey) return;
                const scope = scopesByAccordion[acc.id] || allowedScopes[0];
                const lib = await getFieldGroupByKeyAPI(acc.sourceKey, scope);
                if (!lib || !lib._id) return;
                await deleteFieldGroupFromLibraryAPI(lib._id);
                await refreshGroups();
                // remove any accordions in this template that came from the deleted group
                setAccordions((prev) => prev.filter((a) => a.sourceKey !== acc.sourceKey));
              } catch (e) {
                console.warn('Failed to delete section from library', e);
              }
            }}
            onSyncGroup={async (acc) => {
              try {
                await syncOneAccordion(acc);
              } catch (e) {
                console.warn('Failed to sync section from library', e);
              }
            }}
            onScopeChange={(id, scope) => {
              setScopesByAccordion((prev) => ({ ...prev, [id]: scope }));
              setAccordions((prev) => prev.map((a) => (a.id === id ? { ...a, scope } : a)));
            }}
            onSaveGroup={async (acc) => {
              try {
                const group = {
                  key: (acc.name || '').toString().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, ''),
                  label: acc.name || 'Section',
                  scope: scopesByAccordion[acc.id] || allowedScopes[0],
                  fields: (acc.fields || []).map((f) => ({
                    key: f.id || f.key || f.name,
                    label: f.name || f.label || f.id,
                    type: f.type || 'text',
                    placeholder: f.placeholder || '',
                    instructions: f.instructions || '',
                    tags: Array.isArray(f.tags) ? f.tags : [],
                  })),
                };
                await upsertFieldGroupToLibraryAPI(group);
                await refreshGroups();
              } catch (e) {
                console.warn('Failed to save section to library', e);
              }
            }}
          />

          {accordions.some((a) => a.fields.length > 0) && (
            <div className="pt-3">
              <button
                onClick={persistAll}
                className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Save All Changes
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "tags" && (
        <div className="p-2">
          <TagsManager
            tags={tagsRegistry}
            setTags={setTagsRegistry}
            getUsageCount={getTagUsageCount}
          />
        </div>
      )}

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Tip: Values you insert for fields are reusable within the same section (group) when
        filling out a template. Use accordions to group related fields.
      </p>
    </div>
  );
}
