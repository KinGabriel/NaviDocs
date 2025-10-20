import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronLeft, RotateCcw, X, Grid3x3, Plus, Trash2 } from "lucide-react";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import Panel from "../layout/editable_fields/panel";
import TextEditor from "../layout/create_template/textEditor";
import fetchAndNormalizeDocument from "../utils/documentLoader";
import { updateDocumentFieldValuesAPI, getFieldSuggestionsAPI, saveFieldSuggestionAPI } from "../api/documentsAPI";
import AutofillModal from "../components/modals/autofillModal";
import { useParams, useLocation } from "react-router-dom";

export default function EditableFields() {
  const user = useUser();
  const allowSchoolScope = (u) => {
    if (!u) return false;
    if (u === 'Document Controller') return true;
    if (typeof u === 'object') {
      if (u.role && (u.role === 'Document Controller' || u.role.name === 'Document Controller')) return true;
      if (Array.isArray(u.roles) && u.roles.some(r => r && r.name === 'Document Controller')) return true;
    }
    return false;
  };
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});
  const routeParams = useParams();
  const { state: navState } = useLocation();
  const id = routeParams.id || routeParams.documentId || routeParams.document_id || routeParams.docId || routeParams._id;
  const [showClearModal, setShowClearModal] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docData, setDocData] = useState(null);
  const [docError, setDocError] = useState(null);

  const scrollToAndHighlightField = (editor, fieldName) => {
  if (!editor) return;
  
  try {
    const { state } = editor;
    let targetPos = null;
    
    // Find the position of the editableField node with matching key
    state.doc.descendants((node, pos) => {
      if (node.type && node.type.name === 'editableField') {
        const key = node.attrs?.key;
        if (key === fieldName) {
          targetPos = pos;
          return false; 
        }
      }
    });
    
    if (targetPos !== null) {
      // Scroll the field into view and highlight it
      setTimeout(() => {
        const dom = editor.view.domAtPos(targetPos + 1);
        if (dom && dom.node) {
          const element = dom.node.nodeType === 3 ? dom.node.parentElement : dom.node;
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // temporary highlight effect
            element.style.transition = 'background-color 0.3s ease';
            element.style.backgroundColor = '#fef3c7'; // Light yellow highlight
            
            setTimeout(() => {
              element.style.backgroundColor = '';
            }, 1000);
          }
        }
      }, 50);
    }
  } catch (err) {
    console.debug('Error scrolling to field:', err);
  }
};

 const TableManager = ({ editor }) => {
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const isInTable = editor?.isActive('table');

  const handleInsertTable = async () => {
    if (!editor) {
      console.warn('Editor not available');
      return;
    }

    console.log('Inserting table:', rows, 'x', cols);

    try {
      // Method 1: Try direct insertion
      const success = editor
        .chain()
        .focus()
        .insertTable({ 
          rows: Number(rows), 
          cols: Number(cols), 
          withHeaderRow: true 
        })
        .run();

      if (success) {
        console.log('Table inserted successfully');
      } else {
        console.log('Direct insertion failed, trying insertContent...');
        // Method 2: Build table HTML and insert it
        let tableHTML = '<table><tbody>';
        // Header row
        tableHTML += '<tr>';
        for (let c = 0; c < Number(cols); c++) {
          tableHTML += '<th><p></p></th>';
        }
        tableHTML += '</tr>';
        
        // Data rows
        for (let r = 1; r < Number(rows); r++) {
          tableHTML += '<tr>';
          for (let c = 0; c < Number(cols); c++) {
            tableHTML += '<td><p></p></td>';
          }
          tableHTML += '</tr>';
        }
        
        tableHTML += '</tbody></table>';
        
        const htmlSuccess = editor
          .chain()
          .focus()
          .insertContent(tableHTML)
          .run();
          
        if (htmlSuccess) {
          console.log('Table inserted via HTML');
        } else {
          console.error('Both insertion methods failed');
        }
      }
      
      // Force editor update
      setTimeout(() => {
        if (editor?.view) {
          editor.view.dispatch(editor.state.tr);
        }
      }, 100);
      
    } catch (err) {
      console.error('Error inserting table:', err);
    }

    setShowTableDialog(false);
    setRows(3);
    setCols(3);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
            <Grid3x3 className="w-4 h-4 mr-2" />
            Table Tools
          </h3>
          <button
            onClick={() => setShowTableDialog(true)}
            disabled={!editor}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              editor
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
            }`}
          >
            <Plus className="w-4 h-4 mr-1" />
            Insert Table
          </button>
        </div>

        {editor && isInTable && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Table selected:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
              >
                <Plus className="w-3 h-3 mr-1" />
                Row Before
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
              >
                <Plus className="w-3 h-3 mr-1" />
                Row After
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
              >
                <Plus className="w-3 h-3 mr-1" />
                Column Before
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
              >
                <Plus className="w-3 h-3 mr-1" />
                Column After
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Row
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Column
              </button>
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="col-span-2 inline-flex items-center justify-center px-3 py-1.5 bg-red-600 text-white border border-red-700 rounded-lg text-xs font-medium hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete Table
              </button>
            </div>
          </div>
        )}
      </div>

      {showTableDialog && createPortal(
        <div
          className="fixed inset-0 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowTableDialog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Insert Table</h3>
              <button
                onClick={() => setShowTableDialog(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={cols}
                  onChange={(e) => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowTableDialog(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInsertTable}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 active:scale-95"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

  // dummy config for panels and fields - change as needed depending on the required editable fields 
  const panelsConfig = [
    {
      number: 1,
      title: "Hello World",
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

  // Aggregate editableField nodes from the document (first pages_json item)
  const panelsFromDoc = useMemo(() => {
    if (!docData || !docData.pages_json) return null;
    const base = docData.pages_json[0];
    if (!base || typeof base === 'string') return null;

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
          const label = origKey
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

          extracted.push({
            type: type === 'text' ? 'input' : type,
            name: key,
            label: label || origKey,
            placeholder,
          });
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };

    if (Array.isArray(base.content)) base.content.forEach(walk);

    if (extracted.length === 0) return null;
    return [
      {
        number: 1,
        title: docData.from_template?.title || 'Document Fields',
        subtitle: docData.from_template?.description || '',
        color: 'bg-blue-500',
        fields: extracted,
      },
    ];
  }, [docData]);

  const panelsToUse = panelsFromDoc || panelsFromTemplate || panelsConfig;
  const [currentField, setCurrentField] = useState(null);
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
        if (!ignore) {
          setDocData(normalized);
          try {
            // Initialize formData immediately from normalized field values so the left panel populates
            const rawInitial = normalized.document?.field_values || normalized.field_values || {};
            const initial = {};
            Object.keys(rawInitial || {}).forEach((k) => { initial[k] = rawInitial[k]; });
            let merged = { ...(initial || {}) };
            if (normalized.from_template && Array.isArray(normalized.from_template.fields)) {
              normalized.from_template.fields.forEach((f) => {
                const orig = f.name || f.key || f._id || f.id;
                const name = orig;
                if (name && (merged[name] === undefined || merged[name] === null || merged[name] === '')) {
                  if (f.default !== undefined) merged[name] = f.default;
                  else if (f.value !== undefined) merged[name] = f.value;
                  else merged[name] = merged[name] ?? '';
                }
              });
            }
            // ensure page keys exist
            try {
              const base = normalized.pages_json?.[0];
              if (base && typeof base !== 'string') {
                const page = (base.content || [])[0];
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
            } catch (e) {
              // ignore
            }
            setFormData(merged);
          } catch (e) {
            console.debug('editableFields: failed to init formData from normalized doc', e);
          }
        }
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
    // also ensure keys from document editableField nodes are present
    try {
      const base = docData.pages_json?.[0];
      if (base && typeof base !== 'string') {
        const pageKeys = [];
        const walk = (node) => {
          if (!node) return;
          if (node.type === 'editableField') {
            const orig = node.attrs?.key || node.attrs?.name;
            if (!orig) return;
            const name = orig;
            pageKeys.push(name);
            if (name && (merged[name] === undefined || merged[name] === null)) merged[name] = '';
          }
          if (Array.isArray(node.content)) node.content.forEach(walk);
        };
        if (Array.isArray(base.content)) base.content.forEach(walk);
        console.debug('editableFields:init document editable keys', pageKeys);
      }
    } catch (err) {
      // ignore
    }
  setFormData(merged);
  setCurrentPage(0);
    // If navigation requested autofill, do it once after doc data initializes
    (async () => {
      try {
        if (navState && navState.autoFillFromSuggestions) {
          // allow navigation to include a preferred scope: 'user' | 'school'
          const scope = navState.autoFillScope || 'user';
          await autofillFromSuggestions(panelsToUse, scope);
        }
      } catch (err) {
        console.debug('autofill on nav state failed', err);
      }
    })();
  }, [docData]);

  // Autofill helper: fetch suggestions for each field and fill empty ones
  const autofillFromSuggestions = async (fieldsToUse, scope = 'user') => {
    if (!fieldsToUse || !Array.isArray(fieldsToUse)) return;
    try {
      const keys = fieldsToUse.flatMap(p => (p.fields || []).map(f => f.name));
      const updates = {};
      await Promise.all(keys.map(async (key) => {
        // only fill if current value is empty
        if (formData?.[key] !== undefined && formData[key] !== '') return;
        try {
          const resp = await getFieldSuggestionsAPI(key, scope, 1);
          // backend returns { suggestions: [...] } but helper may return array in some cases
          const suggestions = Array.isArray(resp) ? resp : (resp && resp.suggestions) ? resp.suggestions : [];
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            // suggestions are documents with a `value` property
            const first = suggestions[0];
            updates[key] = first?.value ?? first;
          }
        } catch (err) {
          // ignore individual fetch failures
          console.debug('autofill: failed to fetch suggestions for', key, err);
        }
      }));
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...(prev || {}), ...updates }));
        // also persist these filled values immediately
        const idToUse = docData?._id || docData?.document?._id || id;
        if (idToUse) {
          try {
            await updateDocumentFieldValuesAPI(idToUse, updates);
          } catch (err) {
            console.warn('autofill: failed to persist autofilled values', err);
          }
        }
      }
    } catch (err) {
      console.error('autofillFromSuggestions error', err);
    }
  };

  // fetch a preview suggestion (first suggestion value) for a field key
  const fetchPreview = async (key, scope) => {
    try {
      const resp = await getFieldSuggestionsAPI(key, scope, 1);
      const suggestions = Array.isArray(resp) ? resp : (resp && resp.suggestions) ? resp.suggestions : [];
      if (suggestions && suggestions.length) return suggestions[0]?.value ?? suggestions[0];
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  const handleApplyAutofill = async (items) => {
    // items: [{ key, value, scope }]
    if (!Array.isArray(items) || items.length === 0) {
      setAutofillOpen(false);
      return;
    }
    const updates = {};
    items.forEach(i => { if (i && i.key && i.value !== undefined) updates[i.key] = i.value; });
    if (Object.keys(updates).length === 0) {
      setAutofillOpen(false);
      return;
    }

    setAutofillApplying(true);
    try {
      setFormData(prev => ({ ...(prev || {}), ...updates }));
      const idToUse = docData?._id || docData?.document?._id || id;
      if (idToUse) await updateDocumentFieldValuesAPI(idToUse, updates);

      // Best-effort: persist applied suggestions with chosen scope so future autofill can reuse them
      try {
        await Promise.allSettled(items.map(it => {
          if (!it || !it.key || it.value === undefined) return Promise.resolve();
          // prevent saving at school scope unless user is allowed; fall back to 'user'
          const desired = it.scope || 'user';
          const finalScope = desired === 'school' && !allowSchoolScope(user) ? 'user' : desired;
          return saveFieldSuggestionAPI({ key: it.key, value: it.value, scope: finalScope });
        }));
      } catch (err) {
        console.warn('Failed to persist some autofill suggestions', err);
      }
    } catch (err) {
      console.error('autofill apply failed', err);
    } finally {
      setAutofillApplying(false);
      setAutofillOpen(false);
    }
  };

  // page nodes: if pages_json contains ProseMirror doc object, extract page nodes
  // no per-page nodes; we operate on the first normalized pages_json item as the full doc preview

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
    if (typeof base === 'string') return applyPlaceholdersToHtml(base, formData);

    // deep-clone the base node so we can inject values without mutating docData
    const cloned = JSON.parse(JSON.stringify(base));
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') {
        const origKey = node.attrs?.key;
        const key = origKey;
        const val = formData?.[key];
        if (val !== undefined && val !== null && String(val) !== '') {
          node.content = [{ type: 'text', text: String(val) }];
        } else {
          node.content = node.content || [];
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    if (Array.isArray(cloned.content)) cloned.content.forEach(walk);

    // construct a minimal doc object with this cloned content so TipTap receives a valid doc
    return { type: 'doc', content: Array.isArray(cloned.content) ? cloned.content : [cloned] };
  }, [docData, formData]);

  //count editableField nodes in the document to confirm they exist
  useEffect(() => {
    if (!docData || !docData.pages_json) return;
    try {
      const base = docData.pages_json[0];
      if (!base || typeof base === 'string') return;
      let count = 0;
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'editableField') count += 1;
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      if (Array.isArray(base.content)) base.content.forEach(walk);
      console.debug(`editableFields.jsx: document contains ${count} editableField node(s)`);
    } catch (err) {
      console.debug('editableFields.jsx: error counting editableField nodes', err);
    }
  }, [docData]);

  // visible count for UI: number of editableField nodes across the document
  const editableCount = useMemo(() => {
    if (!docData || !docData.pages_json) return 0;
    const base = docData.pages_json[0];
    if (!base || typeof base === 'string') return 0;
    let count = 0;
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') count += 1;
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    if (Array.isArray(base.content)) base.content.forEach(walk);
    return count;
  }, [docData]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [autofillApplying, setAutofillApplying] = useState(false);
  const editorRef = useRef(null);
  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);

  // whether formData differs from last saved values
  const dirty = useMemo(() => {
    try {
      return JSON.stringify(formData || {}) !== JSON.stringify(lastSavedRef.current || {});
    } catch (e) {
      return false;
    }
  }, [formData, lastSavedAt]);
  
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

  // Autosave formData to backend (debounced). Sends only changed keys to reduce payload
  const autosaveTimerRef = useRef(null);
  const lastSavedRef = useRef({});
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // don't auto-save until we've loaded the document and initialized formData
    if (!docData) return;
    if (initialLoadRef.current) {
      // first time we set formData from docData; mark as initialized but don't save
      initialLoadRef.current = false;
      // include title in lastSavedRef so future diffs consider it
      lastSavedRef.current = { ...(formData || {}), __title: docData?.title };
      return;
    }

    // compute diff between lastSavedRef and current formData
    const changed = {};
    Object.keys(formData || {}).forEach((k) => {
      const prev = lastSavedRef.current?.[k];
      const cur = formData[k];
      if (String(prev || '') !== String(cur || '')) changed[k] = cur;
    });

    // check if title changed
    const prevTitle = lastSavedRef.current?.__title;
    const curTitle = docData?.title;
    const titleChanged = String(prevTitle || '') !== String(curTitle || '');

    // nothing changed -> nothing to save
    if (Object.keys(changed).length === 0 && !titleChanged) return;

    // debounce saves
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const idToUse = docData._id || docData.document?._id || id;
      if (!idToUse) return;
      setSaving(true);
      setSaveError(null);
      try {
        // include title when it changed (API will ignore if undefined)
        const titleToSend = titleChanged ? curTitle : undefined;
        await updateDocumentFieldValuesAPI(idToUse, changed, titleToSend);
        // mark as saved
        lastSavedRef.current = { ...(lastSavedRef.current || {}), ...changed };
        if (titleChanged) lastSavedRef.current.__title = curTitle;
        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        console.error('autosave error', err);
        setSaveError(err?.message || 'Autosave failed');
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, docData]);

  // When the document changes, ensure formData contains keys for all editableField nodes
  // and apply current formData to the editor.
  useEffect(() => {
    if (!docData) return;
    try {
      const base = docData.pages_json?.[0];
      if (!base || typeof base === 'string') return;

      const additions = {};
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'editableField') {
          const orig = node.attrs?.key || node.attrs?.name;
          if (orig && (formData[orig] === undefined || formData[orig] === null)) {
            additions[orig] = '';
          }
        }
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      if (Array.isArray(base.content)) base.content.forEach(walk);

      if (Object.keys(additions).length > 0) {
        setFormData((prev) => ({ ...(prev || {}), ...additions }));
      }

      if (editorRef.current) {
        try {
          isApplyingRef.current = true;
          applyFormDataToEditor(editorRef.current);
        } catch (err) {
          console.debug('editableFields: error applying formData', err);
        } finally {
          setTimeout(() => { isApplyingRef.current = false; }, 50);
        }
      }
    } catch (err) {
      console.debug('editableFields: document change handling error', err);
    }
  }, [docData]);

  // Progress Navigation - shows which section (panel group) is currently visible
  const ProgressNavigation = ({ panelsConfig }) => {
    const currentPanels = panelsConfig.slice(currentPage * sectionsPerPage, (currentPage + 1) * sectionsPerPage);
    return (
      <div className="bg-white p-4 border-gray-200 border-b">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Current:</span>
          {currentPanels.length > 0 ? (
            currentPanels.map((panel, index) => (
              <div key={panel.number} className="flex items-center">
                <div className={`w-6 h-6 ${panel.color} rounded-full flex items-center justify-center text-white font-medium text-xs`}>
                  {panel.number}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">{panel.title}</span>
                {index < currentPanels.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-3" />
                )}
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-500 italic">No editable sections</span>
          )}
        </div>
      </div>
    );
  };

return (
  <>
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <EditableFieldsHeader
        title={docData?.title || docData?.document?.title || 'Untitled Document'}
        user={user}
        setTitle={(t) => setDocData((d) => (d ? { ...d, title: t } : d))}
        saving={saving}
        lastSavedAt={lastSavedAt ? new Date(lastSavedAt) : null}
        dirty={dirty}
        documentId={id}
      />

      <div className="flex flex-1">
        {/* Left Panel - Sticky */}
        <div className="w-1/2 bg-gray-50 relative">
          {/* Progress Navigation - Full Width */}
          <div className="sticky top-0 z-10 bg-gray-50">
            <ProgressNavigation panelsConfig={panelsToUse} />
          </div>
          
          <div className="sticky top-0 h-screen overflow-y-auto p-6 space-y-6 pt-20">{/* Added pt-20 to account for progress nav height */}

            {/* Clear All & Autofill Buttons */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowClearModal(true)}
                disabled={Object.keys(formData).length === 0}
                className={`inline-flex items-center px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm active:scale-95 ${
                  Object.keys(formData).length > 0
                    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300"
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear All
              </button>

              {/* Autofill button: fetch saved suggestions and populate empty fields */}
              <button
                onClick={() => setAutofillOpen(true)}
                className="ml-3 shadow-sm inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm bg-green-50 text-green-700 border border-green-100 hover:bg-green-100"
              >
                Autofill
              </button>
            </div>

            {/* Render current panels or show a helpful message when the current page has no editable fields */}
            {docData && docData.pages_json && typeof docData.pages_json[0] !== 'string' && editableCount === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="space-y-2">
                  <div className="text-lg font-medium text-gray-700">No editable fields for this page</div>
                  <div className="text-sm text-gray-500">This page doesn't contain any editable placeholders. Please go to another page to edit fields</div>
                </div>
              </div>
            ) : (
             currentPanels.map((panel, idx) => (
            <Panel
              key={idx}
              number={panel.number}
              title={panel.title}
              subtitle={panel.subtitle}
              color={panel.color}
              fields={panel.fields}
              formData={formData}
              onChange={handleInputChange}
              onFocusField={(fieldName) => {
                setCurrentField(fieldName);
                // Scroll to and highlight the field in the editor when focused in the panel
                if (editorRef.current) {
                  scrollToAndHighlightField(editorRef.current, fieldName);
                }
              }}
              user={user}
            />
          ))
            )}

            {/* Insertion of Table */}
            {editorRef.current && <TableManager editor={editorRef.current} />}

            {/* Action Buttons */}
            <div className="flex justify-end items-center pt-6">
              <div className="flex items-center space-x-3">
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
        </div>

        {/* Text Editor - Right Panel */}
        <div className="w-1/2 p-6 bg-white shadow-md">
          <div className="bg-white p-1 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              
              {/* Document Info */}
              <div className="text-sm text-gray-700 font-medium">Document preview</div>

              {/* Status & Editable Fields */}
              <div className="flex items-center space-x-4 text-sm">
                {/* Editable Fields */}
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Editable fields:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    {editableCount}
                  </span>
                </div>

                {/* Save Status */}
                <div className="flex items-center space-x-1 text-xs">
                  {saving ? (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Saving…</span>
                    </div>
                  ) : saveError ? (
                    <span className="text-red-500 font-medium">Save failed</span>
                  ) : lastSavedAt ? (
                    <span className="text-gray-500">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
                  ) : (
                    <span className="text-gray-400">Not saved</span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-gray-200 mb-4"></div>

            {/* Content / Editor */}
            <div className="flex-1 overflow-auto">
              {loadingDoc ? (
                <div className="text-center py-12 text-gray-400 italic">Loading document preview…</div>
              ) : docError ? (
                <div className="text-center py-12 text-red-600 font-medium">{docError}</div>
              ) : docData && contentForEditor ? (
                <TextEditor
                  content={contentForEditor}
                  pageSetup={docData?.pageSetup}
                  mode="document"
                  logoConfig={docData?.logoConfig || docData?.from_template?.logoConfig || null}
                  templateStatus={docData?.from_template?.status || docData?.status || null}
                  documentCode={docData?.document_code || docData?.document?.document_code || docData?.from_template?.document_code || null}
                  revisionNo={docData?.revision_no ?? docData?.document?.revision_no ?? docData?.from_template?.revision_no ?? null}
                  effectivity={docData?.effectivity || docData?.document?.effectivity || docData?.from_template?.effectivity || null}
                  onEditorReady={(editor) => {
                    editorRef.current = editor;
                    console.log('✅ Editor ready:', editor);
                    try {
                      isApplyingRef.current = true;
                      applyFormDataToEditor(editor);
                    } catch (err) {
                      console.debug('editableFields: error applying initial formData to editor', err);
                    } finally {
                      setTimeout(() => { isApplyingRef.current = false; }, 50);
                    }
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
                              newValues[origKey] = node.textContent || '';
                            }
                          });
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
                <div className="text-center py-12 text-gray-400 italic">No document preview available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Clear All Modal - Rendered at root level */}
    {showClearModal && (
      <div
        className="fixed inset-0 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
        onClick={() => setShowClearModal(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-gray-200 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowClearModal(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4 border border-red-100 mx-auto">
            <RotateCcw className="w-7 h-7 text-red-600" />
          </div>

          <h2 className="text-lg font-semibold text-gray-800 text-center mb-3">
            Clear All Form Data
          </h2>
          <p className="text-gray-600 text-center text-sm mb-6">
            Are you sure you want to clear all form data? This action cannot be undone.
          </p>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowClearModal(false)}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setFormData({});
                setShowClearModal(false);
              }}
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-all duration-200 active:scale-95"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Autofill modal */}
    <AutofillModal
      open={autofillOpen}
      onClose={() => setAutofillOpen(false)}
      fields={panelsToUse ? panelsToUse.flatMap(p => p.fields || []) : []}
      fetchPreview={fetchPreview}
      onApply={handleApplyAutofill}
      applying={autofillApplying}
      user={user}
    />
  </>
);
}