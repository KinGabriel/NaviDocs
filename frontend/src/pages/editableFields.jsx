import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import Panel from "../layout/editable_fields/panel";
import TextEditor from "../layout/create_template/textEditor";
import fetchAndNormalizeDocument from "../utils/documentLoader";
import { updateDocumentFieldValuesAPI } from "../api/documentsAPI";
import { useParams } from "react-router-dom";

export default function EditableFields() {
  const user = useUser();
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});
  const routeParams = useParams();
  const id = routeParams.id || routeParams.documentId || routeParams.document_id || routeParams.docId || routeParams._id;

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docData, setDocData] = useState(null);
  const [docError, setDocError] = useState(null);
  const [docPage, setDocPage] = useState(0);


  // dummy config for panels and fields - change as needed depending on the required editable fields 
  const panelsConfig = [
    {
      number: 1,
      title: "Hello World",
      subtitle: "Basic course details and identifiers",
      color: "bg-blue-500",
      fields: [
        { type: "input", name: "courseName", label: "Course Name", placeholder: "Enter course name" },
        { type: "input", name: "courseNumber", label: "Course Number", placeholder: "Enter course number" },
        { type: "input", name: "semesterOffered", label: "Semester and Year Offered", placeholder: "e.g., 3rd Year 1st Semester" },
      ],
    },
    {
      number: 2,
      title: "Institution",
      subtitle: "Institution details and programs",
      color: "bg-green-500",
      fields: [
        { type: "input", name: "institution", label: "Institution", placeholder: "Enter institution name" },
        { type: "input", name: "schoolDepartment", label: "School/Department", placeholder: "Enter school/department" },
        { type: "input", name: "program", label: "Program", placeholder: "Enter program" },
      ],
    },
    {
      number: 3,
      title: "Course Requirements & Description",
      subtitle: "Prerequisites, co-requisites, and course overview",
      color: "bg-purple-500",
      fields: [
        { type: "textarea", name: "prerequisites", label: "Pre-requisites", placeholder: "Enter prerequisites" },
        { type: "textarea", name: "corequisites", label: "Co-requisites", placeholder: "Enter corequisites" },
        { type: "textarea", name: "courseDescription", label: "Course Description", placeholder: "Enter course description" },
      ],
    },
  ];

  // If the loaded document includes template fields, use them (follow DB structure)
  const panelsFromTemplate = useMemo(() => {
    if (!docData || !docData.from_template || !Array.isArray(docData.from_template.fields)) return null;
    const tpl = docData.from_template;
    // Simple grouping: keep all fields in a single panel unless the template defines a panel grouping
    const fields = tpl.fields.map((f) => {
      const orig = f.name || f.key || f._id || f.id;
      const name = orig;
      return {
        type: f.type || 'input',
        name,
        label: f.label || f.title || f.name || f.key,
        placeholder: f.placeholder || ''
      };
    });
    return [
      {
        number: 1,
        title: tpl.title || 'Template Fields',
        subtitle: tpl.description || '',
        color: 'bg-blue-500',
        fields,
      },
    ];
  }, [docData]);

  // Prefer fields found directly in the selected page's editableField nodes
  const panelsFromPage = useMemo(() => {
    if (!docData || !docData.pages_json) return null;
    const base = docData.pages_json[0];
    if (!base || typeof base === 'string') return null;
    const page = (base.content || [])[docPage];
    if (!page) return null;

    const extracted = [];
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') {
        const origKey = node.attrs?.key || node.attrs?.name;
        if (!origKey) return; // skip fields without a key
        const placeholder = node.attrs?.placeholder || node.attrs?.ph || '';
        const type = (node.attrs && node.attrs.type) || 'input';
        const key = origKey;
        // avoid duplicates
        if (!extracted.find(f => f.name === key)) {
          extracted.push({ type: type === 'text' ? 'input' : type, name: key, label: origKey, placeholder });
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(page);

    if (extracted.length === 0) return null;
    return [
      {
        number: 1,
        title: docData.from_template?.title || 'Page Fields',
        subtitle: docData.from_template?.description || '',
        color: 'bg-blue-500',
        fields: extracted,
      },
    ];
  }, [docData, docPage]);

  const panelsToUse = panelsFromPage || panelsFromTemplate || panelsConfig;
  const sectionsPerPage = 2;
  const totalPages = Math.max(1, Math.ceil(panelsToUse.length / sectionsPerPage));
  const currentPanels = panelsToUse.slice(
    currentPage * sectionsPerPage,
    (currentPage + 1) * sectionsPerPage
  );

  // load document using fetchAndNormalizeDocument (centralized normalizer)
  useEffect(() => {
    if (!id) {
      console.debug('editableFields: no document id found in route params', routeParams);
      return;
    }
    let ignore = false;
    const load = async () => {
      setLoadingDoc(true);
      try {
        const normalized = await fetchAndNormalizeDocument(id);
        console.debug('editableFields: fetched normalized document', normalized);
        // fallback: if pages_json is empty but document has pages under document.pages_json, copy that
        if ((!normalized.pages_json || normalized.pages_json.length === 0) && normalized.document && normalized.document.pages_json) {
          normalized.pages_json = Array.isArray(normalized.document.pages_json) ? normalized.document.pages_json : [normalized.document.pages_json];
        }
        // also fallback to possible HTML body fields
        if ((!normalized.pages_json || normalized.pages_json.length === 0) && (normalized.document?.pages_html || normalized.document?.html || normalized.pages_html)) {
          const html = normalized.document?.pages_html || normalized.document?.html || normalized.pages_html;
          normalized.pages_json = Array.isArray(html) ? html : [html];
        }
        if (!ignore) setDocData(normalized);
      } catch (err) {
        console.error(err);
        if (!ignore) setDocError(err?.message || "Failed to load document");
      } finally {
        if (!ignore) setLoadingDoc(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [id]);

  // init formData from loaded document
  useEffect(() => {
    if (!docData) return;
    const rawInitial = docData.document?.field_values || docData.field_values || {};
    // map initial keys to canonical names
    const initial = {};
    Object.keys(rawInitial || {}).forEach((k) => {
      const name = k;
      initial[name] = rawInitial[k];
    });
    // merge defaults from template fields when present
    let merged = { ...(initial || {}) };
    if (docData.from_template && Array.isArray(docData.from_template.fields)) {
      docData.from_template.fields.forEach((f) => {
          const orig = f.name || f.key || f._id || f.id;
        const name = orig;
        if (name && (merged[name] === undefined || merged[name] === null || merged[name] === '')) {
          if (f.default !== undefined) merged[name] = f.default;
          else if (f.value !== undefined) merged[name] = f.value;
          else merged[name] = merged[name] ?? '';
        }
      });
    }
    // also ensure keys from page editableField nodes are present
    try {
      const base = docData.pages_json?.[0];
      if (base && typeof base !== 'string') {
        const page = (base.content || [])[docPage];
        const walk = (node) => {
          if (!node) return;
          if (node.type === 'editableField') {
            const orig = node.attrs?.key || node.attrs?.name;
            if (!orig) return;
            const name = orig;
            if (name && (merged[name] === undefined || merged[name] === null)) merged[name] = '';
          }
          if (Array.isArray(node.content)) node.content.forEach(walk);
        };
        walk(page);
      }
    } catch (err) {
      // ignore
    }
    setFormData(merged);
    setCurrentPage(0);
    setDocPage(0);
  }, [docData]);

  // page nodes: if pages_json contains ProseMirror doc object, extract page nodes
  const pageNodes = useMemo(() => {
    const base = docData?.pages_json?.[0];
    if (!base) return [];
    if (typeof base === 'string') return [];
    return (base.content || []).filter(n => n.type === 'page');
  }, [docData]);

  const docTotalPages = Math.max(1, pageNodes.length || (docData?.pages_json && docData.pages_json.length ? 1 : 0));

  // safely apply placeholders only when the page content is a HTML/string
  const applyPlaceholdersToHtml = (html, values = {}) => {
    if (!html || typeof html !== 'string') return html;
    return html.replace(/\{\{([A-Za-z0-9_\-]+)\}\}/g, (_, key) => {
      const v = values[key];
      return v === undefined || v === null ? '' : String(v);
    });
  };

  const contentForEditor = useMemo(() => {
    if (!docData) return null;
    const base = docData?.pages_json?.[0];
    // if the backend returned an HTML string for pages, map placeholders and let TextEditor normalize
    if (typeof base === 'string') {
      return applyPlaceholdersToHtml(base, formData);
    }
    // otherwise use the page node object (TipTap/ProseMirror shape)
    const pageNode = pageNodes[docPage] || (base && (base.content || []).find(n => n.type === 'page'));
    if (!pageNode) return base || { type: 'doc', content: [] };
    // deep-clone the page node so we can inject values without mutating docData
    const cloned = JSON.parse(JSON.stringify(pageNode));
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') {
        const origKey = node.attrs?.key;
        const key = origKey;
        const val = formData?.[key];
        if (val !== undefined && val !== null && String(val) !== '') {
          node.content = [{ type: 'text', text: String(val) }];
        } else {
          // keep existing content or ensure empty array
          node.content = node.content || [];
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(cloned);

    // construct a minimal doc object with this cloned page node so TipTap receives a valid doc
    return { type: 'doc', content: [cloned] };
  }, [docData, pageNodes, docPage, formData]);

  //count editableField nodes in selected page to confirm they exist
  useEffect(() => {
    if (!docData || !docData.pages_json) return;
    try {
      const base = docData.pages_json[0];
      if (!base || typeof base === 'string') return;
      const page = (base.content || [])[docPage];
      if (!page) return;
      let count = 0;
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'editableField') count += 1;
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      walk(page);
      console.debug(`editableFields.jsx: page ${docPage} contains ${count} editableField node(s)`);
    } catch (err) {
      console.debug('editableFields.jsx: error counting editableField nodes', err);
    }
  }, [docData, docPage]);

  // visible count for UI: number of editableField nodes in the current page
  const editableCount = useMemo(() => {
    if (!docData || !docData.pages_json) return 0;
    const base = docData.pages_json[0];
    if (!base || typeof base === 'string') return 0;
    const page = (base.content || [])[docPage];
    if (!page) return 0;
    let count = 0;
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') count += 1;
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(page);
    return count;
  }, [docData, docPage]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const editorRef = useRef(null);
  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);

  const handleSave = async () => {
    if (!docData) return;
    const idToUse = docData._id || docData.document?._id;
    setSaving(true); setSaveError(null);
    try {
      // convert canonical keys back to original keys when possible
      const payload = {};
      Object.keys(formData || {}).forEach((k) => {
        payload[k] = formData[k];
      });
      await updateDocumentFieldValuesAPI(idToUse, payload);
    } catch (err) {
      console.error(err); setSaveError(err?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  // Apply formData (or a partial map) into editor's editableField nodes
  const applyFormDataToEditor = (editor, partial = null) => {
    if (!editor) return;
    const state = editor.state;
    const tr = state.tr;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (node.type && node.type.name === 'editableField') {
        const origKey = node.attrs?.key;
        if (!origKey) return;
        const key = origKey;
        // if a partial map is provided, skip keys not in it 
        const shouldApply = !partial || Object.prototype.hasOwnProperty.call(partial, key);
        if (!shouldApply) return;
        const newVal = (partial ? partial[key] : formData[key]) ?? '';
        const existing = node.textContent || '';
        if (String(existing) !== String(newVal)) {
          // replace inner content of node: from pos+1 to pos+node.nodeSize-1
          const from = pos + 1;
          const to = pos + node.nodeSize - 1;
          tr.replaceWith(from, to, state.schema.text(String(newVal)));
          changed = true;
        }
      }
    });

    if (changed) {
      editor.view.dispatch(tr);
    }
  };

  // Progress Navigation
  const ProgressNavigation = ({ panelsConfig, currentPage }) => {
    const currentPanels = panelsConfig.slice(currentPage * 2, (currentPage + 1) * 2);
    return (
      <div className="bg-white p-4 border-gray-200 border-b">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Current:</span>
          {currentPanels.map((panel, index) => (
            <div key={panel.number} className="flex items-center">
              <div className={`w-6 h-6 ${panel.color} rounded-full flex items-center justify-center text-white font-medium text-xs`}>
                {panel.number}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">{panel.title}</span>
              {index < currentPanels.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300 ml-3" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <EditableFieldsHeader user={user} />

      {/* Progress Navigation */}
      <ProgressNavigation panelsConfig={panelsToUse} currentPage={currentPage} />
      <div className="flex flex-1">
        <div className="w-1/2 bg-gray-50 p-6 space-y-6">
          {/* Render current panels */}
          {currentPanels.map((panel, idx) => (
            <Panel
              key={idx}
              number={panel.number}
              title={panel.title}
              subtitle={panel.subtitle}
              color={panel.color}
              fields={panel.fields}
              formData={formData}
              onChange={handleInputChange}
            />
          ))}

          {/* Dot slider */}
          <div className="flex items-center justify-center space-x-2 pt-4">
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentPage
                    ? "bg-[#003DA5] scale-125"
                    : "bg-gray-300 hover:bg-gray-400 hover:scale-110"
                }`}
              />
            ))}
          </div>

       {/* Action Buttons */}
          <div className="flex justify-end items-center pt-6">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all form data? This action cannot be undone.")) {
                    setFormData({});
                  }
                }}
                disabled={Object.keys(formData).length === 0}
                className={`
                  inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200
                  ${Object.keys(formData).length > 0
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300" 
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  }
                `}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </button>

              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                  className="inline-flex items-center px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-[#003DA5] hover:text-[#003DA5] hover:shadow-md transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </button>
              )}
              
              {currentPage < totalPages - 1 && (
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
                  className="inline-flex items-center px-6 py-2.5 bg-[#003DA5] text-white rounded-lg font-medium text-sm hover:bg-[#052c6d] transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Text Editor - Right Panel */}
        <div className="w-1/2 p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <div />
              <div className="text-sm text-gray-500">Editable fields on page: <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{editableCount}</span></div>
            </div>
            {loadingDoc ? (
              <div className="text-center py-12 text-gray-500">Loading document preview…</div>
            ) : docError ? (
              <div className="text-center py-12 text-red-600">{docError}</div>
            ) : docData && contentForEditor ? (
              <TextEditor
                content={contentForEditor}
                pageSetup={docData?.pageSetup}
                mode="document"
                onEditorReady={(editor) => {
                  // capture editor instance
                  editorRef.current = editor;
                  // initial apply of formData into editor
                  try {
                    isApplyingRef.current = true;
                    applyFormDataToEditor(editor);
                  } catch (err) {
                    console.debug('editableFields: error applying initial formData to editor', err);
                  } finally {
                    setTimeout(() => { isApplyingRef.current = false; }, 50);
                  }

                  // listen for updates from the editor (user edits)
                  editor.on('update', () => {
                    if (isApplyingRef.current) return;
                    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
                    updateTimerRef.current = setTimeout(() => {
                      try {
                        const newValues = {};
                        editor.state.doc.descendants((node) => {
                          if (node.type && node.type.name === 'editableField') {
                            const origKey = node.attrs?.key;
                            if (!origKey) return;
                            const key = origKey;
                            const txt = node.textContent || '';
                            newValues[key] = txt;
                          }
                        });
                        // merge into formData only if changed
                        setFormData((prev) => {
                          let changed = false;
                          const merged = { ...prev };
                          Object.keys(newValues).forEach((k) => {
                            if (merged[k] !== newValues[k]) {
                              merged[k] = newValues[k];
                              changed = true;
                            }
                          });
                          return changed ? merged : prev;
                        });
                      } catch (err) {
                        console.debug('editableFields: error reading editableField from editor', err);
                      }
                    }, 150);
                  });
                }}
                onContentChange={() => {}}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">No document preview available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
