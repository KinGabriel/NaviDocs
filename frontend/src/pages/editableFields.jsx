/**
 * @fileoverview Advanced document editing interface with live field editing, autofill, and PDF export.
 * Provides a split-view layout with a form panel for field inputs and a live document preview with
 * TipTap editor integration. Supports responsive design, autosave, duplicate field management, and
 * table manipulation.
 * 
 * @module pages/EditableFields
 * @requires react
 * @requires react-dom
 * @requires lucide-react
 * @requires react-router-dom
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  X,
  Grid3x3,
  Plus,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Calendar,
  Type,
  AlignLeft
} from "lucide-react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Loader from "../components/loader";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import TextEditor from "../layout/create_template/textEditor";
import fetchAndNormalizeDocument from "../utils/documentLoader";
import {
  updateDocumentFieldValuesAPI,
  getFieldSuggestionsAPI,
  saveFieldSuggestionAPI,
} from "../api/documentsAPI";
import AutofillModal from "../components/modals/autofillModal";
import DownloadingModal from "../components/modals/downloadingModal";
import exportDocumentPdf from "../utils/exportPdf";

/**
 * Main editable fields page component providing a comprehensive document editing interface.
 * 
 * Features:
 * - Split-view layout: Form panel (left) and document preview (right)
 * - Live field editing with real-time preview updates
 * - Autosave functionality with debouncing (700ms)
 * - Autofill from saved suggestions (user/school scope)
 * - Duplicate field management with cycle navigation
 * - Responsive design with mobile drawer
 * - Desktop sidebar collapse (56px mini / 360px full)
 * - PDF export with optional cloud storage
 * - Table insertion and manipulation tools
 * - Field highlighting and scroll-to-field navigation
 * - Progress pagination for large field sets
 * - Integration with TipTap editor for rich text editing
 * 
 * @component
 * @returns {JSX.Element} Complete editable fields interface
 * 
 */
export default function EditableFields() {
  const user = useUser();
  const navigate = useNavigate();
  
  const routeParams = useParams();
  const { state: navState } = useLocation();
  
  const id =
    routeParams.id ||
    routeParams.documentId ||
    routeParams.document_id ||
    routeParams.docId ||
    routeParams._id;

  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({});
  const [currentSection, setCurrentSection] = useState(0);
  
  // doc data and loading
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docData, setDocData] = useState(null);
  const [docError, setDocError] = useState(null);

  // modals / ui
  const [showClearModal, setShowClearModal] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [dlErr, setDlErr] = useState("");
  const [autofillOpen, setAutofillOpen] = useState(false);
  const [autofillApplying, setAutofillApplying] = useState(false);
  const [matchMode, setMatchMode] = useState('label-tags');

  // header status
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // editor refs / sync
  const editorRef = useRef(null);
  const duplicatePositionsRef = useRef({});
  const [duplicateCounts, setDuplicateCounts] = useState({});
  const [duplicateIndices, setDuplicateIndices] = useState({});

  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);

  // autosave/tracking refs
  const initialLoadRef = useRef(true); // suppress autosave on first load
  const lastSavedRef = useRef({});
  const autosaveTimerRef = useRef(null); // debounce handle for autosave

  // reload counter
  const [reloadCounter, setReloadCounter] = useState(0);

  const allowSchoolScope = (u) => {
    if (!u) return false;
    if (u === "Document Controller") return true;
    if (typeof u === "object") {
      if (
        u.role &&
        (u.role === "Document Controller" ||
          u.role.name === "Document Controller")
      )
        return true;
      if (
        Array.isArray(u.roles) &&
        u.roles.some((r) => r && r.name === "Document Controller")
      )
        return true;
    }
    return false;
  };

  /**
   * Exports the current document as PDF, optionally storing in cloud storage.
   * Captures rendered HTML from the editor for accurate PDF generation.
   * 
   * @async
   * @param {Object} [options={}] - Export options
   * @param {boolean} [options.store=true] - Whether to store PDF in cloud storage
   * @param {string} [options.folderId] - Target folder ID for storage
   * @throws {Error} If document ID is not available or export fails
   * 
   * @example
   * // Export and download locally only
   * await handleExportPDF({ store: false });
   * 
   * @example
   * // Export and store in specific folder
   * await handleExportPDF({ store: true, folderId: 'folder-123' });
   */
  // ---------------------------
  // EXPORT PDF
  // ---------------------------
  const handleExportPDF = async (options = { store: true, folderId: undefined }) => {
    try {
      const idToUse = docData?._id || docData?.document?._id || id;
      if (!idToUse) throw new Error("No document id available for export");

      // try to capture rendered HTML from editor
      let providedHtml = null;
      try {
        const paginated = document.querySelector(".rm-with-pagination");
        if (paginated) {
          providedHtml = paginated.outerHTML;
        } else if (
          editorRef.current &&
          editorRef.current.view &&
          editorRef.current.view.dom
        ) {
          providedHtml = editorRef.current.view.dom.outerHTML;
        } else if (
          editorRef.current &&
          typeof editorRef.current.getHTML === "function"
        ) {
          providedHtml = editorRef.current.getHTML();
        }

        const headInner =
          (document.querySelector("head") &&
            document.querySelector("head").innerHTML) ||
          "";
        if (providedHtml) {
          providedHtml = `<!doctype html><html><head>${headInner}</head><body>${providedHtml}</body></html>`;
        }
      } catch (e) {
        console.debug("handleExportPDF: failed capture, fallback server render", e);
        providedHtml = null;
      }

      const pageSetupToSend =
        docData?.pageSetup || docData?.from_template?.pageSetup || null;

      const storeFlag =
        options && typeof options.store !== "undefined"
          ? !!options.store
          : true;

      const safeTitle =
        (docData?.title || "document").replace(/[^a-z0-9\-_. ]/gi, "_") ||
        "document";
      const fileName = `${safeTitle}.pdf`;

      await exportDocumentPdf({
        documentId: idToUse,
        fileName,
        html: providedHtml,
        pageSetup: pageSetupToSend,
        store: storeFlag,
        folderId: options.folderId,
        userId: user?._id,
      });
    } catch (err) {
      console.error("export PDF failed", err);
      throw err;
    }
  };

  const handleExportDocx = async () => {
    const editor = editorRef.current;
    if (!editor) {
      console.warn("No editor instance available for DOCX export");
      return;
    }

    try {
      if (typeof editor.commands.exportDocx !== "function") {
        console.warn("exportDocx command is not registered on this editor");
        return;
      }

      await editor.commands.exportDocx();
    } catch (err) {
      console.error("DOCX export failed:", err);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

/**
   * Scrolls to and highlights a specific field in the editor by field name.
   * Supports label-based field names with automatic key mapping.
   * 
   * @param {Object} editor - TipTap editor instance
   * @param {string} fieldName - Field name or label to scroll to
   * 
   * @example
   * scrollToAndHighlightField(editorRef.current, 'Employee Name');
   */
  // ---------------------------
  // SCROLL/HIGHLIGHT HELPERS
  // ---------------------------
  const scrollToAndHighlightField = (editor, fieldName) => {
    if (!editor) return;

    try {
      const { state } = editor;
      let targetPos = null;

      state.doc.descendants((node, pos) => {
        if (node.type && node.type.name === "editableField") {
          const key = node.attrs?.key;
          // support label-based fieldName by mapping back to original key if available
          let matches = false;
          try {
            const k2l = lastSavedRef.current.__keyToLabel || {};
            const l2k = {};
            Object.keys(k2l).forEach(k => { l2k[k2l[k]] = k; });
            const keyFromLabel = l2k[fieldName] || fieldName;
            matches = key === keyFromLabel;
          } catch {
            matches = key === fieldName;
          }
          if (matches) {
            targetPos = pos;
            return false;
          }
        }
      });

      if (targetPos !== null) {
        setTimeout(() => {
          const dom = editor.view.domAtPos(targetPos + 1);
          if (dom && dom.node) {
            const element =
              dom.node.nodeType === 3 ? dom.node.parentElement : dom.node;
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });

              element.style.transition = "background-color 0.3s ease";
              element.style.backgroundColor = "#fef3c7";

              setTimeout(() => {
                element.style.backgroundColor = "";
              }, 1000);
            }
          }
        }, 50);
      }
    } catch (err) {
      console.debug("Error scrolling to field:", err);
    }
  };

/**
   * Cycles through duplicate occurrences of a field, scrolling to the next/previous instance.
   * 
   * @param {string} fieldName - Field name to cycle
   * @param {('next'|'prev')} [direction='next'] - Cycle direction
   * 
   * @example
   * // Navigate to next occurrence
   * cycleDuplicate('Date', 'next');
   * 
   * @example
   * // Navigate to previous occurrence
   * cycleDuplicate('Date', 'prev');
   */
  // cycle duplicates of the same field
  const cycleDuplicate = (fieldName, direction = "next") => {
    const positions = duplicatePositionsRef.current[fieldName] || [];
    if (!positions.length || !editorRef.current) return;
    setDuplicateIndices((prev) => {
      const cur = prev?.[fieldName] ?? 0;
      const len = positions.length;
      const next =
        direction === "next"
          ? (cur + 1) % len
          : (cur - 1 + len) % len;

      const updated = { ...(prev || {}) };
      updated[fieldName] = next;

      scrollToEditorPos(editorRef.current, positions[next]);
      return updated;
    });
  };


/**
   * Recomputes positions and counts for all duplicate fields in the document.
   * Updates duplicatePositionsRef, duplicateCounts, and duplicateIndices.
   * 
   * @param {Object} editor - TipTap editor instance
   */
  // recompute duplicate positions/counts
  const computeDuplicatePositions = (editor) => {
    try {
      if (!editor || !editor.state) return;
      const map = {};
      const k2l = lastSavedRef.current.__keyToLabel || {};
      editor.state.doc.descendants((node, pos) => {
        if (node.type && node.type.name === "editableField") {
          const key = node.attrs?.key || node.attrs?.name;
          if (!key) return;
          const label = k2l[key] || key;
          if (!map[label]) map[label] = [];
          map[label].push(pos);
        }
      });
      duplicatePositionsRef.current = map;

      const counts = {};
      Object.keys(map).forEach((k) => {
        counts[k] = map[k].length;
      });
      setDuplicateCounts(counts);

      setDuplicateIndices((prev) => {
        const next = { ...(prev || {}) };
        Object.keys(counts).forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(next, k)) next[k] = 0;
          else if (next[k] >= counts[k])
            next[k] = Math.max(0, counts[k] - 1);
        });
        return next;
      });
    } catch (err) {
      console.debug("computeDuplicatePositions error", err);
    }
  };

  // ---------------------------
  // PANELS / FIELDS SETUP
  // ---------------------------
  const panelsFromTemplate = useMemo(() => {
    if (!docData || !docData.from_template) return null;
    const tpl = docData.from_template;
    const list = Array.isArray(tpl.fields) ? tpl.fields : [];
    if (list.length === 0) return null;

    const keysInDoc = new Set();
    try {
      const base = docData.pages_json?.[0];
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'editableField') {
          const k = node.attrs?.key || node.attrs?.name;
          if (k) keysInDoc.add(k);
        }
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      if (base && typeof base !== 'string' && Array.isArray(base.content)) {
        base.content.forEach(walk);
      }
    } catch (_) { }

    if (list[0] && Array.isArray(list[0].fields)) {
      let number = 1;
      const panels = [];
      const localFieldsBucket = [];
      for (const section of list) {
        if (!section) continue;
        const sectionFields = Array.isArray(section.fields) ? section.fields : [];
        const mapped = sectionFields
          .filter((f) => {
            const key = f.key || f.id || f.name || f._id;
            return keysInDoc.size === 0 || (key && keysInDoc.has(key));
          })
          .map((f) => {
            const key = f.key || f.id || f.name || f._id;
            const label = f.label || f.title || f.display || f.name || key;
            return {
              type: (f.type === 'text' ? 'input' : f.type) || 'input',
              name: label,
              _originalKey: key,
              label,
              placeholder: f.placeholder || '',
              instructions: f.instructions || '',
              dateFormat: f.dateFormat || null,
              required: !!f.required,
              options: f.options ?? null,
              tags: Array.isArray(f.tags) ? f.tags : [],
              tagColors: f.tagColors && typeof f.tagColors === 'object' ? f.tagColors : undefined,
            };
          });
        if (mapped.length === 0) continue;

        if (section.isLocalOnly) {
          localFieldsBucket.push(...mapped);
        } else {
          panels.push({
            number: number++,
            title: section.name || 'Section',
            subtitle: section.scope ? `Scope: ${section.scope}` : undefined,
            color: 'bg-blue-500',
            fields: mapped,
          });
        }
      }
      if (localFieldsBucket.length > 0) {
        panels.push({
          number: number++,
          title: 'Other fields',
          color: 'bg-blue-500',
          fields: localFieldsBucket,
        });
      }
      return panels.length ? panels : null;
    }

    const fields = list
      .filter((f) => {
        const key = f.key || f.id || f.name || f._id;
        return keysInDoc.size === 0 || (key && keysInDoc.has(key));
      })
      .map((f) => {
        const key = f.key || f.id || f.name || f._id;
        const label = f.label || f.title || f.display || f.name || key;
        return {
          type: (f.type === 'text' ? 'input' : f.type) || 'input',
          name: label,
          _originalKey: key,
          label,
          placeholder: f.placeholder || '',
          dateFormat: f.dateFormat || null,
          instructions: f.instructions || '',
          required: !!f.required,
          options: f.options ?? null,
          tags: Array.isArray(f.tags) ? f.tags : [],
          tagColors: f.tagColors && typeof f.tagColors === 'object' ? f.tagColors : undefined,
        };
      });
    if (!fields.length) return null;
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

  const fieldMetaByName = useMemo(() => {
    const meta = {};
    try {
      const tpl = docData?.from_template;
      const list = Array.isArray(tpl?.fields) ? tpl.fields : [];
      const flatten = (arr) => arr.flatMap((s) => (Array.isArray(s?.fields) ? s.fields : [s]));
      const flat = list[0] && Array.isArray(list[0]?.fields) ? flatten(list) : list;
      flat.forEach((f) => {
        if (!f) return;
        const key = f.key || f.id || f.name || f._id;
        if (!key) return;
        const label = f.label || f.title || f.display || f.name || key;
        meta[key] = {
          label,
          originalKey: key,
          tags: Array.isArray(f.tags) ? f.tags : [],
          tagColors: f.tagColors && typeof f.tagColors === 'object' ? f.tagColors : undefined,
        };
        if (!meta[label]) {
          meta[label] = {
            label,
            originalKey: key,
            tags: Array.isArray(f.tags) ? f.tags : [],
            tagColors: f.tagColors && typeof f.tagColors === 'object' ? f.tagColors : undefined,
          };
        }
      });
    } catch {}
    return meta;
  }, [docData]);

  const panelsToUse = panelsFromTemplate || [];
  const sections = panelsToUse;

  // ---------------------------
  // DOCUMENT LOAD
  // ---------------------------
  useEffect(() => {
    if (!id) {
      console.debug("editableFields: no document id found in route params", routeParams);
      return;
    }

    let ignore = false;
    const load = async () => {
      setLoadingDoc(true);
      try {
        const normalized = await fetchAndNormalizeDocument(id);
        console.debug("editableFields: fetched normalized document", normalized);

        if (
          (!normalized.pages_json || normalized.pages_json.length === 0) &&
          normalized.document &&
          normalized.document.pages_json
        ) {
          normalized.pages_json = Array.isArray(normalized.document.pages_json)
            ? normalized.document.pages_json
            : [normalized.document.pages_json];
        }

        if (
          (!normalized.pages_json || normalized.pages_json.length === 0) &&
          (normalized.document?.pages_html || normalized.document?.html || normalized.pages_html)
        ) {
          const html =
            normalized.document?.pages_html || normalized.document?.html || normalized.pages_html;
          normalized.pages_json = Array.isArray(html) ? html : [html];
        }

        if (!ignore) {
          setDocData(normalized);

          try {
            const rawInitial =
              normalized.document?.field_values || normalized.field_values || {};
            const initial = {};
            Object.keys(rawInitial || {}).forEach((k) => {
              initial[k] = rawInitial[k];
            });

            let merged = { ...(initial || {}) };
            if (normalized.from_template && Array.isArray(normalized.from_template.fields)) {
              normalized.from_template.fields.forEach((f) => {
                const orig = f.name || f.key || f._id || f.id;
                const name = orig;
                if (
                  name &&
                  (merged[name] === undefined || merged[name] === null || merged[name] === "")
                ) {
                  if (f.default !== undefined) merged[name] = f.default;
                  else if (f.value !== undefined) merged[name] = f.value;
                  else merged[name] = merged[name] ?? "";
                }
              });
            }

            try {
              const base = normalized.pages_json?.[0];
              if (base && typeof base !== "string") {
                const walk = (node) => {
                  if (!node) return;
                  if (node.type === "editableField") {
                    const orig = node.attrs?.key || node.attrs?.name;
                    if (orig && merged[orig] === undefined) {
                      merged[orig] = "";
                    }
                  }
                  if (Array.isArray(node.content)) node.content.forEach(walk);
                };
                if (Array.isArray(base.content)) {
                  base.content.forEach(walk);
                }
              }
            } catch (e) { }

            try {
              const remapped = {};
              const tplFields = normalized.from_template?.fields || [];
              const keyToLabel = {};
              tplFields.forEach(f => {
                const k = f.key || f.id || f.name || f._id;
                const lbl = f.label || f.title || f.display || f.name || k;
                if (k) keyToLabel[String(k)] = String(lbl);
              });
              Object.keys(merged).forEach(k => {
                const lbl = keyToLabel[k];
                if (lbl) {
                  if (remapped[lbl] === undefined) remapped[lbl] = merged[k];
                  else remapped[`${lbl}__${k}`] = merged[k];
                } else {
                  remapped[k] = merged[k];
                }
              });
              setFormData(remapped);
              lastSavedRef.current.__keyToLabel = keyToLabel;
            } catch (e) {
              setFormData(merged);
            }
          } catch (e) {
            console.debug("editableFields: failed init formData", e);
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

    return () => {
      ignore = true;
    };
  }, [id, reloadCounter]);

  // ---------------------------
  // AUTOFILL HELPERS
  // ---------------------------
  const fetchPreview = async (key, scope, mode) => {
    try {
      const meta = fieldMetaByName[key] || {};
      const effectiveMode = mode || matchMode;
      const resp = await getFieldSuggestionsAPI(key, scope, 1, meta.label, meta.tags, effectiveMode);
      const suggestions = Array.isArray(resp)
        ? resp
        : resp && resp.suggestions
        ? resp.suggestions
        : [];
      if (suggestions && suggestions.length) return suggestions[0]?.value ?? suggestions[0];
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  /**
   * Autofills all empty fields from saved suggestions based on scope and matching mode.
   * 
   * @async
   * @param {Array} fieldsToUse - Array of panel configurations with fields
   * @param {('user'|'school')} [scope='user'] - Suggestion scope
   * @param {string} mode - Matching mode
   * 
   * @example
   * await autofillFromSuggestions(panelsToUse, 'user', 'label-tags');
   */
  const autofillFromSuggestions = async (fieldsToUse, scope = "user", mode) => {
    if (!fieldsToUse || !Array.isArray(fieldsToUse)) return;
    try {
      const keys = fieldsToUse.flatMap((p) =>
        (p.fields || []).map((f) => f.name)
      );
      const updates = {};

      await Promise.all(
        keys.map(async (key) => {
          if (
            formData?.[key] !== undefined &&
            formData[key] !== ""
          )
            return;
          try {
            const meta = fieldMetaByName[key] || {};
            const resp = await getFieldSuggestionsAPI(
              key,
              scope,
              1,
              meta.label,
              meta.tags,
              mode || matchMode
            );
            const suggestions = Array.isArray(resp)
              ? resp
              : resp && resp.suggestions
              ? resp.suggestions
              : [];
            if (
              Array.isArray(suggestions) &&
              suggestions.length > 0
            ) {
              const first = suggestions[0];
              updates[key] = first?.value ?? first;
            }
          } catch (err) {
            console.debug(
              "autofill: failed suggestion for",
              key,
              err
            );
          }
        })
      );

      if (Object.keys(updates).length > 0) {
        setFormData((prev) => ({ ...(prev || {}), ...updates }));

        const idToUse =
          docData?._id || docData?.document?._id || id;
        if (idToUse) {
          try {
            await updateDocumentFieldValuesAPI(
              idToUse,
              updates
            );
          } catch (err) {
            console.warn(
              "autofill: failed to persist autofilled values",
              err
            );
          }
        }
      }
    } catch (err) {
      console.error("autofillFromSuggestions error", err);
    }
  };

 /**
   * Applies selected autofill items to form data and persists to server.
   * Also saves new suggestions for future use.
   * 
   * @async
   * @param {Array<{key: string, value: any, scope: string}>} items - Autofill items to apply
   */
  const handleApplyAutofill = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      setAutofillOpen(false);
      return;
    }
    const updates = {};
    items.forEach((i) => {
      if (i && i.key && i.value !== undefined) updates[i.key] = i.value;
    });
    if (Object.keys(updates).length === 0) {
      setAutofillOpen(false);
      return;
    }

    setAutofillApplying(true);
    try {
      setFormData((prev) => ({ ...(prev || {}), ...updates }));
      const idToUse = docData?._id || docData?.document?._id || id;
      if (idToUse) await updateDocumentFieldValuesAPI(idToUse, updates);

      try {
        await Promise.allSettled(
          items.map((it) => {
            if (!it || !it.key || it.value === undefined) return Promise.resolve();
            const desired = it.scope || "user";
            const finalScope = desired === "school" && !allowSchoolScope(user) ? "user" : desired;
            const meta = fieldMetaByName[it.key] || {};
            return saveFieldSuggestionAPI({
              key: it.key,
              label: meta.label,
              tags: Array.isArray(meta.tags) ? meta.tags : [],
              value: it.value,
              scope: finalScope,
            });
          })
        );
      } catch (err) {
        console.warn("Failed to persist some autofill suggestions", err);
      }
    } catch (err) {
      console.error("autofill apply failed", err);
    } finally {
      setAutofillApplying(false);
      setAutofillOpen(false);
    }
  };

  // ---------------------------
  // EDITOR CONTENT
  // ---------------------------
  const contentForEditor = useMemo(() => {
    if (!docData) return null;

    const base = docData?.pages_json?.[0];
    if (typeof base === "string") {
      return base;
    }

    const cloned = JSON.parse(JSON.stringify(base));
    const keyToLabel = {};
    try {
      const tplFields = docData?.from_template?.fields || [];
      const flatten = (arr) => arr.flatMap((s) => (Array.isArray(s?.fields) ? s.fields : [s]));
      const flat = tplFields[0] && Array.isArray(tplFields[0]?.fields) ? flatten(tplFields) : tplFields;
      flat.forEach((f) => {
        if (!f) return;
        const k = f.key || f.id || f.name || f._id;
        const lbl = f.label || f.title || f.display || f.name || k;
        if (k) keyToLabel[String(k)] = String(lbl);
      });
    } catch {}
    const walk = (node) => {
      if (!node) return;
      if (node.type === "editableField") {
        const key = node.attrs?.key;
        const label = keyToLabel[key] || key;
        const val = formData?.[label];
        if (val !== undefined && val !== null && String(val) !== "") {
          node.content = [
            {
              type: "text",
              text: String(val),
            },
          ];
        } else {
          node.content = node.content || [];
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    if (Array.isArray(cloned.content)) cloned.content.forEach(walk);

    return {
      type: "doc",
      content: Array.isArray(cloned.content) ? cloned.content : [cloned],
    };
  }, [docData, formData]);

  // ---------------------------
  // AUTOSAVE
  // ---------------------------
  useEffect(() => {
    if (!docData) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      lastSavedRef.current = {
        ...(formData || {}),
        __title: docData?.title,
      };
      return;
    }

    const changed = {};
    const keyToLabel = lastSavedRef.current.__keyToLabel || {};
    const labelToKey = {};
    Object.keys(keyToLabel).forEach(k => { labelToKey[keyToLabel[k]] = k; });
    Object.keys(formData || {}).forEach((label) => {
      const origKey = labelToKey[label] || label;
      const prevVal = lastSavedRef.current?.[label];
      const curVal = formData[label];
      if (String(prevVal || "") !== String(curVal || "")) {
        changed[origKey] = curVal;
      }
    });

    const prevTitle = lastSavedRef.current?.__title;
    const curTitle = docData?.title;
    const titleChanged = String(prevTitle || "") !== String(curTitle || "");

    if (Object.keys(changed).length === 0 && !titleChanged) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      const idToUse = docData._id || docData.document?._id || id;
      if (!idToUse) return;

      setSaving(true);
      setSaveError(null);

      try {
        const titleToSend = titleChanged ? curTitle : undefined;

        await updateDocumentFieldValuesAPI(idToUse, changed, titleToSend);

        const nextSaved = { ...(lastSavedRef.current || {}) };
        Object.keys(formData || {}).forEach(l => { nextSaved[l] = formData[l]; });
        lastSavedRef.current = nextSaved;
        if (titleChanged) lastSavedRef.current.__title = curTitle;

        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        console.error("autosave error", err);
        setSaveError(err?.message || "Autosave failed");
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, docData, id]);

  const applyFormDataToEditor = (editor, partial = null) => {
    if (!editor) return;
    const state = editor.state;
    const tr = state.tr;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (node.type && node.type.name === "editableField") {
        const key = node.attrs?.key;
        if (!key) return;
        let label = key;
        try {
          const k2l = lastSavedRef.current.__keyToLabel || {};
          if (k2l[key]) label = k2l[key];
        } catch {}
        const shouldApply = !partial || Object.prototype.hasOwnProperty.call(partial, label);

        if (!shouldApply) return;

        const newVal = (partial ? partial[label] : formData[label]) ?? "";
        const existing = node.textContent || "";

        if (String(existing) !== String(newVal)) {
          const from = pos + 1;
          const to = pos + node.nodeSize - 1;
          if (newVal === undefined || newVal === null || String(newVal) === "") {
            tr.delete(from, to);
          } else {
            tr.replaceWith(from, to, state.schema.text(String(newVal)));
          }
          changed = true;
        }
      }
    });

    if (changed) {
      editor.view.dispatch(tr);
    }
  };

  useEffect(() => {
    if (!docData) return;
    try {
      const base = docData.pages_json?.[0];
      if (!base || typeof base === "string") return;

      const additions = {};
      const walk = (node) => {
        if (!node) return;
        if (node.type === "editableField") {
          const orig = node.attrs?.key || node.attrs?.name;
          if (orig && (formData[orig] === undefined || formData[orig] === null)) {
            additions[orig] = "";
          }
        }
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      if (Array.isArray(base.content)) base.content.forEach(walk);

      if (Object.keys(additions).length > 0) {
        setFormData((prev) => ({
          ...(prev || {}),
          ...additions,
        }));
      }

      if (editorRef.current) {
        try {
          isApplyingRef.current = true;
          applyFormDataToEditor(editorRef.current);
        } catch (err) {
          console.debug("editableFields: error applying formData", err);
        } finally {
          setTimeout(() => {
            isApplyingRef.current = false;
          }, 50);
        }
      }
    } catch (err) {
      console.debug("editableFields: document change handling error", err);
    }
  }, [docData]);

  const currentSectionData = sections[currentSection] || { title: "", fields: [] };
  const totalSections = sections.length;

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <EditableFieldsHeader
        title={docData?.title || docData?.document?.title || "Untitled Document"}
        user={user}
        setTitle={(t) => setDocData((d) => (d ? { ...d, title: t } : d))}
        saving={saving}
        lastSavedAt={lastSavedAt ? new Date(lastSavedAt) : null}
        dirty={false}
        documentId={id}
        onExportPDF={handleExportPDF}
        onExportDocx={handleExportDocx}
        documentData={docData}
        onDocumentUpdate={(updates) => setDocData((d) => (d ? { ...d, ...updates } : d))}
        mobileSidebarOpen={false}
        setMobileSidebarOpen={() => {}}
      />

      {loadingDoc ? (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader message="Loading document..." />
        </div>
      ) : docError ? (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-100 rounded-lg p-6">
            <div className="text-red-700 font-semibold mb-2">Failed to load document</div>
            <div className="text-sm text-red-600 mb-4">{docError}</div>
            <div className="flex gap-3">
              <button
                onClick={() => setReloadCounter((c) => c + 1)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#003DA5] text-white rounded-md text-sm hover:bg-[#052c6d]"
              >
                Hard Refresh
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main Content */}
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Action Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      showPreview
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        View Preview
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setAutofillOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium hover:bg-green-100 transition-colors border border-green-200"
                  >
                    <Plus className="w-4 h-4" />
                    Autofill
                  </button>
                </div>

                <button
                  onClick={() => setShowClearModal(true)}
                  disabled={Object.keys(formData).length === 0}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    Object.keys(formData).length > 0
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Preview Mode */}
            {showPreview ? (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-[#003DA5] text-white p-6">
                  <h2 className="text-2xl font-semibold mb-2">Document Preview</h2>
                  <p className="text-blue-100">See how your document looks with the filled data</p>
                </div>
                <div className="p-8">
                  <TextEditor
                    content={contentForEditor}
                    pageSetup={docData?.pageSetup}
                    mode="document"
                    headerConfig={{
                      ...(docData?.headerConfig ||
                        docData?.from_template?.headerConfig ||
                        docData?.logoConfig ||
                        docData?.from_template?.logoConfig ||
                        {}),
                      documentStamp: {
                        docCode:
                          docData?.document_code ||
                          docData?.document?.document_code ||
                          docData?.from_template?.document_code ||
                          "",
                        revisionNo:
                          docData?.revision_no ??
                          docData?.document?.revision_no ??
                          docData?.from_template?.revision_no ??
                          "",
                        effectivity:
                          docData?.effectivity ||
                          docData?.document?.effectivity ||
                          docData?.from_template?.effectivity ||
                          "",
                      },
                    }}
                    onEditorReady={(editor) => {
                      editorRef.current = editor;
                      try {
                        isApplyingRef.current = true;
                        applyFormDataToEditor(editor);
                        computeDuplicatePositions(editor);
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
                                const k2l = lastSavedRef.current.__keyToLabel || {};
                                const label = k2l[origKey] || origKey;
                                newValues[label] = node.textContent || '';
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

                            computeDuplicatePositions(editor);
                          } catch (err) {
                            console.debug("error reading editableField from editor", err);
                          }
                        }, 150);
                      });
                    }}
                    onContentChange={() => {}}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Form Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-3">
                  <div className="h-3 bg-[#003DA5]" />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h2 className="text-3xl font-semibold text-gray-900 mb-2">
                          {currentSectionData.title}
                        </h2>
                        {currentSectionData.subtitle && (
                          <p className="text-base text-gray-600 leading-relaxed">
                            {currentSectionData.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Section Progress */}
                    {totalSections > 1 && (
                      <div className="bg-[#003DA5] rounded-xl p-5 border border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#003DA5] text-white flex items-center justify-center text-sm font-semibold">
                              {currentSection + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Section {currentSection + 1} of {totalSections}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-[#003DA5]">
                            {Math.round(((currentSection + 1) / totalSections) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className="bg-gradient-to-r from-[#003DA5] to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3 mb-6">
                  {currentSectionData.fields && currentSectionData.fields.map((field, idx) => {
                    const value = formData[field.name] || "";
                    const isDuplicate = duplicateCounts[field.name] > 1;
                    const currentDupIndex = duplicateIndices[field.name] || 0;
                    
                    return (
                      <div 
                        key={idx}
                        className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden group"
                      >
                        <div className="p-6">
                          {/* Field Label & Icons */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center border border-blue-100 group-hover:border-blue-300 transition-colors">
                                {field.type === 'input' ? (
                                  <Type className="w-5 h-5 text-[#003DA5]" />
                                ) : field.type === 'textarea' ? (
                                  <AlignLeft className="w-5 h-5 text-[#003DA5]" />
                                ) : field.type === 'date' ? (
                                  <Calendar className="w-5 h-5 text-[#003DA5]" />
                                ) : (
                                  <Type className="w-5 h-5 text-[#003DA5]" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <label className="text-base font-medium text-gray-900">
                                  {field.label || field.name}
                                </label>
                                {field.required && (
                                  <span className="text-red-500 text-base font-medium">*</span>
                                )}
                                {isDuplicate && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                                    {currentDupIndex + 1}/{duplicateCounts[field.name]}
                                  </span>
                                )}
                              </div>
                              
                              {field.instructions && (
                                <p className="text-sm text-gray-600 leading-relaxed">
                                  {field.instructions}
                                </p>
                              )}

                              {/* Tags */}
                              {field.tags && field.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {field.tags.map((tag, tagIdx) => {
                                    const tagColor = field.tagColors?.[tag];
                                    const colorClasses = tagColor
                                      ? `bg-${tagColor}-50 text-${tagColor}-700 border-${tagColor}-200`
                                      : 'bg-blue-50 text-blue-700 border-blue-200';
                                    
                                    return (
                                      <span
                                        key={tagIdx}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colorClasses}`}
                                      >
                                        {tag}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Duplicate Navigation */}
                            {isDuplicate && (
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => {
                                    const newIdx = Math.max(0, currentDupIndex - 1);
                                    setDuplicateIndices((prev) => ({
                                      ...prev,
                                      [field.name]: newIdx,
                                    }));
                                    scrollToAndHighlightField(editorRef.current, field.name);
                                  }}
                                  disabled={currentDupIndex === 0}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    currentDupIndex === 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title="Previous occurrence"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const newIdx = Math.min(
                                      duplicateCounts[field.name] - 1,
                                      currentDupIndex + 1
                                    );
                                    setDuplicateIndices((prev) => ({
                                      ...prev,
                                      [field.name]: newIdx,
                                    }));
                                    scrollToAndHighlightField(editorRef.current, field.name);
                                  }}
                                  disabled={currentDupIndex >= duplicateCounts[field.name] - 1}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    currentDupIndex >= duplicateCounts[field.name] - 1
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title="Next occurrence"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Field Input */}
                          <div className="mt-4">
                            {field.type === 'input' ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                                  placeholder={field.placeholder || 'Enter your answer'}
                                  className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 focus:border-[#003DA5] outline-none transition-colors text-gray-900 placeholder-gray-400 bg-transparent text-base"
                                />
                              </div>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={value}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={field.placeholder || 'Enter your answer'}
                                rows={4}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-y min-h-[100px] text-gray-900 placeholder-gray-400 text-base"
                              />
                            ) : field.type === 'date' ? (
                              <div className="relative">
                                <input
                                  type="date"
                                  value={value}
                                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                                  className="w-full px-0 py-3 border-0 border-b-2 border-gray-300 focus:border-[#003DA5] outline-none transition-colors text-gray-900 bg-transparent text-base"
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Character Count for Textarea */}
                        {field.type === 'textarea' && value && (
                          <div className="px-6 pb-3">
                            <div className="text-xs text-gray-500 text-right">
                              {value.length} characters
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Navigation */}
                {totalSections > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky bottom-4">
                    <div className="flex items-center justify-between gap-4">
                      <button
                        onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                        disabled={currentSection === 0}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                          currentSection === 0
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>

                      {/* Section Indicators */}
                      <div className="flex items-center gap-2">
                        {sections.map((section, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSection(idx)}
                            className={`transition-all rounded-full ${
                              idx === currentSection
                                ? 'bg-[#003DA5] w-10 h-2.5 shadow-md'
                                : 'bg-gray-300 hover:bg-gray-400 w-2.5 h-2.5'
                            }`}
                            title={section.title}
                            aria-label={`Go to ${section.title}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setCurrentSection(prev => Math.min(totalSections - 1, prev + 1))}
                        disabled={currentSection === totalSections - 1}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                          currentSection === totalSections - 1
                            ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-gradient-to-r from-[#003DA5] to-blue-600 text-white hover:from-[#002c7a] hover:to-blue-700 shadow-md hover:shadow-lg'
                        }`}
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Page Info */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-center text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          {currentSectionData.fields?.length || 0}
                        </span>
                        {' '}questions in this section
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Clear All Fields</h3>
              <button
                onClick={() => setShowClearModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all form data? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setFormData({});
                  setShowClearModal(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autofill Modal */}
      <AutofillModal
        open={autofillOpen}
        onClose={() => setAutofillOpen(false)}
        fields={sections.flatMap((s) => s.fields || [])}
        fetchPreview={fetchPreview}
        onApply={handleApplyAutofill}
        applying={autofillApplying}
        user={user}
        matchMode={matchMode}
        onChangeMatchMode={setMatchMode}
      />

      {/* Downloading Modal */}
      <DownloadingModal
        open={dlOpen || !!dlErr}
        isError={!!dlErr}
        title="Downloading PDF…"
        message="Your document is being prepared. This may take a few seconds."
        errorText={dlErr}
        onClose={() => {
          setDlOpen(false);
          setDlErr("");
        }}
      />
    </div>
  );
}