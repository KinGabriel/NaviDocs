// src/layout/create_template/fieldsPanel.jsx
import React, { useState, useMemo } from "react";
import AccordionList from "../../components/editable_fields/accordionList";
import TagsManager from "../../components/editable_fields/tagsManager";

/**
 * FieldsPanel — Enhanced panel with:
 * - Tabbed interface: Editable Fields | Tags
 * - Accordion grouping for fields
 * - Per-field tag selection and tag registry management
 * - Full sync with the text editor for insert/remove actions
 */

export default function FieldsPanel({ editor, fields = [], onChange = () => {} }) {
  const [activeTab, setActiveTab] = useState("fields"); // "fields" | "tags"
  const [accordions, setAccordions] = useState(() => [
    { id: "acc-1", name: "Default Section", fields: [] },
  ]);
  const [tagsRegistry, setTagsRegistry] = useState([]);

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
        key: field.id,
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
    const serialized = accordions.map(({ id, name, fields }) => ({
      id,
      name,
      fields: fields.map(({ id: fid, name, type, placeholder, tags }) => ({
        id: fid,
        name,
        type,
        placeholder,
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
          <AccordionList
            accordions={accordions}
            setAccordions={setAccordions}
            tagsRegistry={tagsRegistry}
            onInsertField={handleInsertField}
            onRemoveField={handleRemoveField}
            onUpdateField={handleUpdateField}
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
        Tip: Use accordions to group editable fields. Each field can be assigned multiple
        colored tags. Tags help organize values when documents are generated.
      </p>
    </div>
  );
}
