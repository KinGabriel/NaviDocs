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
  Menu,
  FileText
} from "lucide-react";
import Loader from "../components/loader";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import useUser from "../hooks/useUser";
import Panel from "../layout/editable_fields/panel";
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
import { useParams, useLocation } from "react-router-dom";

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

/**
   * Checks if a user has permission to use school-wide scope for field suggestions.
   * Only Document Controller roles have this permission.
   * 
   * @param {Object|string} u - User object or role string
   * @returns {boolean} True if user can access school scope
   */
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

  const routeParams = useParams();
  const { state: navState } = useLocation();
  const id =
    routeParams.id ||
    routeParams.documentId ||
    routeParams.document_id ||
    routeParams.docId ||
    routeParams._id;

  // left panel pagination if there are many groups of fields
  const [currentPage, setCurrentPage] = useState(0);

  // main form state
  const [formData, setFormData] = useState({});

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
  const [currentField, setCurrentField] = useState(null);

  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);

  // autosave/tracking refs
  const initialLoadRef = useRef(true); // suppress autosave on first load
  const lastSavedRef = useRef({}); // snapshot of last-saved field values + title
  const autosaveTimerRef = useRef(null); // debounce handle for autosave

  // drawer / sidebar UI
  const [showSidebar, setShowSidebar] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop collapse (56px mini vs 360px full)

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

  // ---------------------------
  // EXPORT DOCX (TipTap client-side)
  // ---------------------------
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

      // This calls ExportDocx.configure(...) from textEditor.jsx
      await editor.commands.exportDocx();
    } catch (err) {
      console.error("DOCX export failed:", err);
      // optional: surface error in a toast or modal if you want
    }
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
   * Scrolls to a specific position in the editor and applies highlight animation.
   * 
   * @param {Object} editor - TipTap editor instance
   * @param {number} pos - Document position to scroll to
   */
  const scrollToEditorPos = (editor, pos) => {
    try {
      if (!editor || !editor.view) return;
      setTimeout(() => {
        try {
          const dom = editor.view.domAtPos(pos + 1);
          if (dom && dom.node) {
            const element =
              dom.node.nodeType === 3 ? dom.node.parentElement : dom.node;
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              element.style.transition = "background-color 0.25s ease";
              element.style.backgroundColor = "#fef3c7";
              setTimeout(() => {
                element.style.backgroundColor = "";
              }, 900);
            }
          }
        } catch (e) {
          /* ignore */
        }
      }, 50);
    } catch (err) {
      console.debug("scrollToEditorPos error", err);
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

  // fallback panelsConfig: empty by default (avoid shipping dummy data)
  const panelsConfig = [];

  // allow manual reloads if load fails
  const [reloadCounter, setReloadCounter] = useState(0);

/**
   * Panels configuration derived from template fields with rich metadata.
   * Supports grouped sections with scope information and local-only fields.
   * 
   * @type {Array<{
   *   number: number,
   *   title: string,
   *   subtitle?: string,
   *   color: string,
   *   fields: Array<{
   *     type: string,
   *     name: string,
   *     _originalKey: string,
   *     label: string,
   *     placeholder: string,
   *     instructions: string,
   *     dateFormat: string|null,
   *     required: boolean,
   *     options: Array|null,
   *     tags: Array<string>,
   *     tagColors: Object
   *   }>
   * }>|null}
   */
  // panels from template (prefer rich labels/instructions; supports grouped sections)
  const panelsFromTemplate = useMemo(() => {
    if (!docData || !docData.from_template) return null;
    const tpl = docData.from_template;
    const list = Array.isArray(tpl.fields) ? tpl.fields : [];
    if (list.length === 0) return null;

    // Build a set of keys that actually appear in the editor to avoid orphan fields
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
    } catch (_) { /* ignore */ }

    // Grouped sections shape: [{ name, scope, fields: [...] }]
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

    // Flat fields fallback
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

  // Build metadata map for fields: name -> { label, tags }
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

  // panels from docData.pages_json (scan editableField nodes)
  const panelsFromDoc = useMemo(() => {
    if (!docData || !docData.pages_json) return null;
    const base = docData.pages_json[0];
    if (!base || typeof base === "string") return null;

    const extracted = [];
    const seen = new Set();

    const walk = (node) => {
      if (!node) return;
      if (node.type === "editableField") {
        const origKey = node.attrs?.key || node.attrs?.name;
        if (!origKey) return;

        if (!seen.has(origKey)) {
          seen.add(origKey);
          const placeholder = node.attrs?.placeholder || node.attrs?.ph || "";
          const fieldType = node.attrs?.type || "input";
          const labelAttr = node.attrs?.label;
          const instructionsAttr = node.attrs?.instructions || node.attrs?.hint || node.attrs?.help;
          const requiredAttr = !!node.attrs?.required;
          const optionsAttr = node.attrs?.options || null;

          // make a nice label from "myFieldName"
          const label = origKey
            .replace(/([A-Z])/g, " $1")
            .replace(/[_-]/g, " ")
            .trim()
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1).toLowerCase()
            )
            .join(" ");

          const displayLabel = labelAttr || label || origKey;
          extracted.push({
            type: fieldType === "text" ? "input" : fieldType,
            name: displayLabel,
            _originalKey: origKey,
            label: displayLabel,
            placeholder,
            instructions: instructionsAttr || "",
            // pass through dateFormat if present on the editableField node
            dateFormat: node.attrs?.dateFormat || null,
            required: requiredAttr,
            options: optionsAttr,
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
        title:
          docData.from_template?.title || "Document Fields",
        subtitle: docData.from_template?.description || "",
        color: "bg-blue-500",
        fields: extracted,
      },
    ];
  }, [docData]);

  // choose which panel source we use (prefer template for rich labels/instructions)
  const panelsToUse =
    panelsFromTemplate || panelsFromDoc || panelsConfig;

  // pagination logic for left panel
  const sectionsPerPage = 2;
  const totalPages = Math.max(
    1,
    Math.ceil(panelsToUse.length / sectionsPerPage)
  );
  const currentPanels = panelsToUse.slice(
    currentPage * sectionsPerPage,
    (currentPage + 1) * sectionsPerPage
  );

  // ---------------------------
  // DOCUMENT LOAD
  // ---------------------------

  useEffect(() => {
    if (!id) {
      console.debug(
        "editableFields: no document id found in route params",
        routeParams
      );
      return;
    }

    let ignore = false;
    const load = async () => {
      setLoadingDoc(true);
      try {
        const normalized = await fetchAndNormalizeDocument(id);
        console.debug(
          "editableFields: fetched normalized document",
          normalized
        );

        // fallback: transfer .document.pages_json -> .pages_json if missing
        if (
          (!normalized.pages_json ||
            normalized.pages_json.length === 0) &&
          normalized.document &&
          normalized.document.pages_json
        ) {
          normalized.pages_json = Array.isArray(
            normalized.document.pages_json
          )
            ? normalized.document.pages_json
            : [normalized.document.pages_json];
        }

        // fallback: if still nothing, try pages_html/html
        if (
          (!normalized.pages_json ||
            normalized.pages_json.length === 0) &&
          (normalized.document?.pages_html ||
            normalized.document?.html ||
            normalized.pages_html)
        ) {
          const html =
            normalized.document?.pages_html ||
            normalized.document?.html ||
            normalized.pages_html;
          normalized.pages_json = Array.isArray(html)
            ? html
            : [html];
        }

        if (!ignore) {
          setDocData(normalized);

          // initialize formData now
          try {
            const rawInitial =
              normalized.document?.field_values ||
              normalized.field_values ||
              {};
            const initial = {};
            Object.keys(rawInitial || {}).forEach((k) => {
              initial[k] = rawInitial[k];
            });

            // merge defaults from template fields
            let merged = { ...(initial || {}) };
            if (
              normalized.from_template &&
              Array.isArray(normalized.from_template.fields)
            ) {
              normalized.from_template.fields.forEach((f) => {
                const orig = f.name || f.key || f._id || f.id;
                const name = orig;
                if (
                  name &&
                  (merged[name] === undefined ||
                    merged[name] === null ||
                    merged[name] === "")
                ) {
                  if (f.default !== undefined)
                    merged[name] = f.default;
                  else if (f.value !== undefined)
                    merged[name] = f.value;
                  else merged[name] = merged[name] ?? "";
                }
              });
            }

            // ensure keys from editableField nodes exist
            try {
              const base = normalized.pages_json?.[0];
              if (base && typeof base !== "string") {
                const walk = (node) => {
                  if (!node) return;
                  if (node.type === "editableField") {
                    const orig =
                      node.attrs?.key || node.attrs?.name;
                    if (orig && merged[orig] === undefined) {
                      merged[orig] = "";
                    }
                  }
                  if (Array.isArray(node.content))
                    node.content.forEach(walk);
                };
                if (Array.isArray(base.content)) {
                  base.content.forEach(walk);
                }
              }
            } catch (e) {
              /* ignore */
            }

            // remap initial data by label for UI
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
            console.debug(
              "editableFields: failed init formData",
              e
            );
          }
        }
      } catch (err) {
        console.error(err);
        if (!ignore)
          setDocError(err?.message || "Failed to load document");
      } finally {
        if (!ignore) setLoadingDoc(false);
      }
    };
    load();

    return () => {
      ignore = true;
    };
  }, [id, reloadCounter]);

  // after docData changes, merge formData again + maybe autofill
  useEffect(() => {
    if (!docData) return;

    const rawInitial =
      docData.document?.field_values ||
      docData.field_values ||
      {};
    const initial = {};
    Object.keys(rawInitial || {}).forEach((k) => {
      initial[k] = rawInitial[k];
    });

    let merged = { ...(initial || {}) };

    if (
      docData.from_template &&
      Array.isArray(docData.from_template.fields)
    ) {
      docData.from_template.fields.forEach((f) => {
        const orig = f.name || f.key || f._id || f.id;
        const name = orig;
        if (
          name &&
          (merged[name] === undefined ||
            merged[name] === null ||
            merged[name] === "")
        ) {
          if (f.default !== undefined) merged[name] = f.default;
          else if (f.value !== undefined) merged[name] = f.value;
          else merged[name] = merged[name] ?? "";
        }
      });
    }

    // ensure keys from editableField nodes
    try {
      const base = docData.pages_json?.[0];
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
        if (Array.isArray(base.content)) base.content.forEach(walk);
      }
    } catch (err) {
      /* ignore */
    }

    // Remap subsequent loads as well
    try {
      const remapped = {};
      const tplFields = docData.from_template?.fields || [];
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
    setCurrentPage(0);

    // optional autofill (navigated here w/ autoFillFromSuggestions flag)
    (async () => {
      try {
        if (navState && navState.autoFillFromSuggestions) {
          const scope = navState.autoFillScope || "user";
          await autofillFromSuggestions(panelsToUse, scope, matchMode);
        }
      } catch (err) {
        console.debug("autofill on nav state failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docData]);

  // ---------------------------
  // AUTOFILL HELPERS
  // ---------------------------
/**
   * Fetches a preview value for a field from saved suggestions.
   * 
   * @async
   * @param {string} key - Field key or label
   * @param {('user'|'school')} scope - Suggestion scope
   * @param {string} mode - Matching mode ('label-tags' or 'key-only')
   * @returns {Promise<any|undefined>} Preview value or undefined if not found
   */
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
      if (suggestions && suggestions.length)
        return suggestions[0]?.value ?? suggestions[0];
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
      if (i && i.key && i.value !== undefined)
        updates[i.key] = i.value;
    });
    if (Object.keys(updates).length === 0) {
      setAutofillOpen(false);
      return;
    }

    setAutofillApplying(true);
    try {
      setFormData((prev) => ({ ...(prev || {}), ...updates }));
      const idToUse =
        docData?._id || docData?.document?._id || id;
      if (idToUse)
        await updateDocumentFieldValuesAPI(idToUse, updates);

      // save suggestions for future scopes, including label & tags metadata
      try {
        await Promise.allSettled(
          items.map((it) => {
            if (!it || !it.key || it.value === undefined)
              return Promise.resolve();
            const desired = it.scope || "user";
            const finalScope =
              desired === "school" && !allowSchoolScope(user)
                ? "user"
                : desired;
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
        console.warn(
          "Failed to persist some autofill suggestions",
          err
        );
      }
    } catch (err) {
      console.error("autofill apply failed", err);
    } finally {
      setAutofillApplying(false);
      setAutofillOpen(false);
    }
  };

  // ---------------------------
  // EDITOR CONTENT (PREVIEW)
  // ---------------------------
 /**
   * Replaces mustache-style placeholders in HTML with form values.
   * 
   * @param {string} html - HTML string with placeholders
   * @param {Object} [values={}] - Field values to substitute
   * @returns {string} HTML with placeholders replaced
   * 
   * @example
   * applyPlaceholdersToHtml('<p>{{name}}</p>', { name: 'John' })
   * // Returns: '<p>John</p>'
   */
  const applyPlaceholdersToHtml = (html, values = {}) => {
    if (!html || typeof html !== "string") return html;
    return html.replace(
      /\{\{([A-Za-z0-9_\-]+)\}\}/g,
      (_, key) => {
        const v = values[key];
        return v === undefined || v === null ? "" : String(v);
      }
    );
  };

/**
   * Editor content with form data applied to editableField nodes.
   * Converts document JSON to TipTap-compatible format with current field values.
   * 
   * @type {Object|string|null}
   */
  const contentForEditor = useMemo(() => {
    if (!docData) return null;

    const base = docData?.pages_json?.[0];
    if (typeof base === "string") {
      return applyPlaceholdersToHtml(base, formData);
    }

    // deep clone so we don't mutate original
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
        if (
          val !== undefined &&
          val !== null &&
          String(val) !== ""
        ) {
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
    if (Array.isArray(cloned.content))
      cloned.content.forEach(walk);

    return {
      type: "doc",
      content: Array.isArray(cloned.content)
        ? cloned.content
        : [cloned],
    };
  }, [docData, formData]);

  // count editableField nodes
  const editableCount = useMemo(() => {
    if (!docData || !docData.pages_json) return 0;
    const base = docData.pages_json[0];
    if (!base || typeof base === "string") return 0;
    let count = 0;
    const walk = (node) => {
      if (!node) return;
      if (node.type === "editableField") count += 1;
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    if (Array.isArray(base.content)) base.content.forEach(walk);
    return count;
  }, [docData]);

  // debug log once
  useEffect(() => {
    if (!docData || !docData.pages_json) return;
    try {
      const base = docData.pages_json[0];
      if (!base || typeof base === "string") return;
      let count = 0;
      const walk = (node) => {
        if (!node) return;
        if (node.type === "editableField") count += 1;
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      if (Array.isArray(base.content)) base.content.forEach(walk);
      console.debug(
        `editableFields.jsx: document contains ${count} editableField node(s)`
      );
    } catch (err) {
      console.debug('computeDuplicatePositions error', err);
    }
  }, [docData]);

  

  // whether formData differs from last saved values
  const dirty = useMemo(() => {
    try {
      return (
        JSON.stringify(formData || {}) !==
        JSON.stringify(lastSavedRef.current || {})
      );
    } catch (e) {
      return false;
    }
  }, [formData, lastSavedAt]);

  // update formData on input
  // update formData by label (panel names are labels now)
  const handleInputChange = (fieldLabel, value) => {
    setFormData((prev) => ({ ...(prev || {}), [fieldLabel]: value }));
  };

  // push formData into editor nodes (replace editableField text)
  const applyFormDataToEditor = (editor, partial = null) => {
    if (!editor) return;
    const state = editor.state;
    const tr = state.tr;
    let changed = false;

    state.doc.descendants((node, pos) => {
      if (
        node.type &&
        node.type.name === "editableField"
      ) {
        const key = node.attrs?.key;
        if (!key) return;
        // translate original key -> label if mapping exists
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
          // If new value is empty, delete content to allow :empty CSS placeholder
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

  // autosave diffed fields + title
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

    // diff formData (labels) vs lastSavedRef, convert back to original keys
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

    // check title change
    const prevTitle = lastSavedRef.current?.__title;
    const curTitle = docData?.title;
    const titleChanged =
      String(prevTitle || "") !== String(curTitle || "");

    if (
      Object.keys(changed).length === 0 &&
      !titleChanged
    )
      return;

    if (autosaveTimerRef.current)
      clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      const idToUse =
        docData._id || docData.document?._id || id;
      if (!idToUse) return;

      setSaving(true);
      setSaveError(null);

      try {
        const titleToSend = titleChanged
          ? curTitle
          : undefined;

        await updateDocumentFieldValuesAPI(
          idToUse,
          changed,
          titleToSend
        );

        // store snapshot using labels for dirty checks
        const nextSaved = { ...(lastSavedRef.current || {}) };
        Object.keys(formData || {}).forEach(l => { nextSaved[l] = formData[l]; });
        lastSavedRef.current = nextSaved;
        if (titleChanged)
          lastSavedRef.current.__title = curTitle;

        setLastSavedAt(new Date().toISOString());
      } catch (err) {
        console.error("autosave error", err);
        setSaveError(err?.message || "Autosave failed");
      } finally {
        setSaving(false);
      }
    }, 700);

    return () => {
      if (autosaveTimerRef.current)
        clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, docData, id]);

  // whenever docData changes, sync new empty keys into formData
  // and push formData into editor
  useEffect(() => {
    if (!docData) return;
    try {
      const base = docData.pages_json?.[0];
      if (!base || typeof base === "string") return;

      const additions = {};
      const walk = (node) => {
        if (!node) return;
        if (node.type === "editableField") {
          const orig =
            node.attrs?.key || node.attrs?.name;
          if (
            orig &&
            (formData[orig] === undefined ||
              formData[orig] === null)
          ) {
            additions[orig] = "";
          }
        }
        if (Array.isArray(node.content))
          node.content.forEach(walk);
      };
      if (Array.isArray(base.content))
        base.content.forEach(walk);

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
          console.debug(
            "editableFields: error applying formData",
            err
          );
        } finally {
          setTimeout(() => {
            isApplyingRef.current = false;
          }, 50);
        }
      }
    } catch (err) {
      console.debug(
        "editableFields: document change handling error",
        err
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docData]);

  // ---------------------------
  // SMALL COMPONENTS
  // ---------------------------
 /**
   * Progress navigation component showing current panel sections.
   * Displays section numbers and titles with navigation indicators.
   * 
   * @component
   * @param {Object} props
   * @param {Array} props.panelsConfig - Full panels configuration
   * @returns {JSX.Element}
   */
  const ProgressNavigation = ({ panelsConfig }) => {
    const slice = panelsConfig.slice(
      currentPage * sectionsPerPage,
      (currentPage + 1) * sectionsPerPage
    );

  // Check if there are any editable fields in the document
  const hasEditableFields = editableCount > 0;

  if (!hasEditableFields) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
             <FileText className="text-blue-600 w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">
              Document Preview Mode
            </p>
            <p className="text-xs text-gray-500">
              This document contains no editable fields
            </p>
          </div>
        </div>
      </div>
    );
  }

    return (
      <div className="bg-white p-4 border-gray-200 border-b">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">Current:</span>
          {slice.length > 0 ? (
            slice.map((panel, index) => (
              <div
                key={panel.number}
                className="flex items-center"
              >
                <div
                  className={`w-6 h-6 ${panel.color} rounded-full flex items-center justify-center text-white font-medium text-xs`}
                >
                  {panel.number}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {panel.title}
                </span>
                {index < slice.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-3" />
                )}
              </div>
            ))
          ) : (
            <span className="text-sm text-gray-500 italic">
              No editable sections
            </span>
          )}
        </div>
      </div>
    );
  };

/**
   * Table management tools for inserting and manipulating tables in the editor.
   * Provides table insertion dialog and row/column manipulation buttons.
   * 
   * @component
   * @param {Object} props
   * @param {Object} props.editor - TipTap editor instance
   * @returns {JSX.Element}
   */
  const TableManager = ({ editor }) => {
    const [showTableDialog, setShowTableDialog] =
      useState(false);
    const [rows, setRows] = useState(3);
    const [cols, setCols] = useState(3);

    const isInTable = editor?.isActive("table");

    const handleInsertTable = async () => {
      if (!editor) {
        console.warn("Editor not available");
        return;
      }

      try {
        const success = editor
          .chain()
          .focus()
          .insertTable({
            rows: Number(rows),
            cols: Number(cols),
            withHeaderRow: true,
          })
          .run();

        if (!success) {
          let tableHTML = "<table><tbody>";
          // header row
          tableHTML += "<tr>";
          for (let c = 0; c < Number(cols); c++) {
            tableHTML += "<th><p></p></th>";
          }
          tableHTML += "</tr>";
          // body rows
          for (let r = 1; r < Number(rows); r++) {
            tableHTML += "<tr>";
            for (let c = 0; c < Number(cols); c++) {
              tableHTML += "<td><p></p></td>";
            }
            tableHTML += "</tr>";
          }
          tableHTML += "</tbody></table>";

          const htmlSuccess = editor
            .chain()
            .focus()
            .insertContent(tableHTML)
            .run();

          if (!htmlSuccess) {
            console.error(
              "Both insertion methods for table failed"
            );
          }
        }

        setTimeout(() => {
          if (editor?.view) {
            editor.view.dispatch(editor.state.tr);
          }
        }, 100);
      } catch (err) {
        console.error("Error inserting table:", err);
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
              <p className="text-xs text-gray-500 mb-2">
                Table selected:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .addRowBefore()
                      .run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Row Before
                </button>

                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .addRowAfter()
                      .run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Row After
                </button>

                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .addColumnBefore()
                      .run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Column Before
                </button>

                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .addColumnAfter()
                      .run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Column After
                </button>

                <button
                  onClick={() =>
                    editor.chain().focus().deleteRow().run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Row
                </button>

                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .deleteColumn()
                      .run()
                  }
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Column
                </button>

                <button
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .deleteTable()
                      .run()
                  }
                  className="col-span-2 inline-flex items-center justify-center px-3 py-1.5 bg-red-600 text-white border border-red-700 rounded-lg text-xs font-medium hover:bg-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Table
                </button>
              </div>
            </div>
          )}
        </div>

        {showTableDialog &&
          createPortal(
            <div
              className="fixed inset-0 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
              onClick={() => setShowTableDialog(false)}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-200 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Insert Table
                  </h3>
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
                      onChange={(e) =>
                        setRows(
                          Math.max(
                            1,
                            Math.min(
                              20,
                              parseInt(e.target.value) || 1
                            )
                          )
                        )
                      }
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
                      onChange={(e) =>
                        setCols(
                          Math.max(
                            1,
                            Math.min(
                              10,
                              parseInt(e.target.value) || 1
                            )
                          )
                        )
                      }
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

  // ---------------------------
  // RENDER
  // ---------------------------

  return (
    <>
      <div className="min-h-screen bg-gray-200 flex flex-col">
        {/* HEADER */}
        <EditableFieldsHeader
          title={
            docData?.title ||
            docData?.document?.title ||
            "Untitled Document"
          }
          user={user}
          setTitle={(t) =>
            setDocData((d) =>
              d ? { ...d, title: t } : d
            )
          }
          saving={saving}
          lastSavedAt={
            lastSavedAt ? new Date(lastSavedAt) : null
          }
          dirty={dirty}
          documentId={id}
          onExportPDF={handleExportPDF}
          onExportDocx={handleExportDocx}
          documentData={docData}
          onDocumentUpdate={(updates) =>
            setDocData((d) =>
              d ? { ...d, ...updates } : d
            )
          }
          // mobile drawer toggle
          mobileSidebarOpen={showSidebar}
          setMobileSidebarOpen={setShowSidebar}
          // desktop collapse toggle
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />

        {/* BODY */}
        <div className="flex flex-1 relative overflow-hidden">
          {/* DESKTOP SIDEBAR */}
          <div
            className={`
              bg-gray-50 border-r border-gray-200 flex-col transition-all duration-200 ease-in-out z-40
              hidden lg:flex
              ${collapsed ? "w-[56px]" : "w-[360px]"}
            `}
          >
            <div className="flex-1 min-h-0 flex flex-col">
              {/* sticky "Current" nav */}
              <div className="sticky top-0 z-10 bg-gray-50">
                <ProgressNavigation panelsConfig={panelsToUse} />
              </div>

              {/* scrollable panel content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* top action row */}
                <div className="flex justify-end mb-4">
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
                    <span className="whitespace-nowrap">Clear All</span>
                  </button>

                  <button
                    onClick={() => setAutofillOpen(true)}
                    className="ml-3 shadow-sm inline-flex items-center px-4 py-2.5 rounded-lg font-medium text-sm bg-green-50 text-green-700 border border-green-100 hover:bg-green-100"
                  >
                    Autofill
                  </button>
                </div>

                {/* either panels, or "no editable fields" message */}
                {docData &&
                docData.pages_json &&
                typeof docData.pages_json[0] !== "string" &&
                editableCount === 0 ? (
                  <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="space-y-2">
                      <div className="text-lg font-medium text-gray-700">
                        No editable fields for this page
                      </div>
                      <div className="text-sm text-gray-500">
                        This page doesn't contain any editable placeholders. Please go to another page to edit fields.
                      </div>
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
                        try {
                          const positions = duplicatePositionsRef.current[fieldName] || [];
                          if (positions.length > 0 && editorRef.current) {
                            setDuplicateIndices((prev) => ({ ...(prev || {}), [fieldName]: 0 }));
                            scrollToEditorPos(editorRef.current, positions[0]);
                          } else if (editorRef.current) {
                            scrollToAndHighlightField(editorRef.current, fieldName);
                          }
                        } catch (err) {
                          console.debug("focus jump error", err);
                        }
                      }}
                      user={user}
                      duplicateCounts={duplicateCounts}
                      duplicateIndices={duplicateIndices}
                      onCycleDuplicate={(fieldName, dir) => cycleDuplicate(fieldName, dir)}
                    />
                  ))
                )}

                {/* Table tools */}
                {editorRef.current && <TableManager editor={editorRef.current} />}

                {/* Pagination buttons */}
                {editableCount > 0 && (
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
              )}
              </div>
            </div>
          </div>


          {/* MOBILE DRAWER SIDEBAR */}
          <div
            className={`
              fixed inset-y-0 left-0 z-50 bg-gray-50 border-r border-gray-200 flex flex-col
              transition-transform duration-200 ease-in-out w-[320px]
              lg:hidden
              ${showSidebar ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            {/* drawer header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
              <div className="flex items-center text-sm font-medium text-gray-700">
                <Menu className="w-4 h-4 mr-2" />
                Fields
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* drawer body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* actions row (stacked) */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowClearModal(true)}
                  disabled={Object.keys(formData).length === 0}
                  className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm active:scale-95 ${
                    Object.keys(formData).length > 0
                      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300"
                      : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                  }`}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Clear All
                </button>

                <button
                  onClick={() => setAutofillOpen(true)}
                  className="shadow-sm inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium text-sm bg-green-50 text-green-700 border border-green-100 hover:bg-green-100"
                >
                  Autofill
                </button>
              </div>

              {/* panel fields */}
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
                  onFocusField={(fieldName) => {
                    setCurrentField(fieldName);
                    try {
                      const positions =
                        duplicatePositionsRef.current[
                          fieldName
                        ] || [];
                      if (
                        positions.length > 0 &&
                        editorRef.current
                      ) {
                        setDuplicateIndices((prev) => ({
                          ...(prev || {}),
                          [fieldName]: 0,
                        }));
                        scrollToEditorPos(
                          editorRef.current,
                          positions[0]
                        );
                      } else if (editorRef.current) {
                        scrollToAndHighlightField(
                          editorRef.current,
                          fieldName
                        );
                      }
                    } catch (err) {
                      console.debug(
                        "focus jump error",
                        err
                      );
                    }
                    // auto-close drawer after jump
                    setShowSidebar(false);
                  }}
                  user={user}
                  duplicateCounts={duplicateCounts}
                  duplicateIndices={duplicateIndices}
                  onCycleDuplicate={(fieldName, dir) =>
                    cycleDuplicate(fieldName, dir)
                  }
                />
              ))}

              {editorRef.current && (
                <TableManager editor={editorRef.current} />
              )}

            {/* mobile pagination */}
            {editableCount > 0 && (
              <div className="flex justify-end items-center pt-4">
                <div className="flex flex-wrap gap-3">
                  {currentPage > 0 && (
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.max(p - 1, 0)
                        )
                      }
                      className="inline-flex items-center px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-lg font-medium text-sm hover:border-[#003DA5] hover:text-[#003DA5] hover:shadow-md transition-all duration-200"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Prev
                    </button>
                  )}

                  {currentPage < totalPages - 1 && (
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(
                            p + 1,
                            totalPages - 1
                          )
                        )
                      }
                      className="inline-flex items-center px-5 py-2 bg-[#003DA5] text-white rounded-lg font-medium text-sm hover:bg-[#052c6d] transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>  
          </div>

          {/* MOBILE BACKDROP */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black/30 z-30 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* MAIN PREVIEW COLUMN */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="flex flex-col flex-1 p-6 h-full">
              {/* preview header row */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                <div className="flex flex-col">
                  <div className="text-sm text-gray-700 font-medium">
                    Document preview
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">
                      Editable fields:
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {editableCount}
                    </span>
                  </div>

                  <div className="flex items-center text-xs">
                    {saving ? (
                      <div className="flex items-center gap-1 text-gray-600">
                        <svg
                          className="animate-spin h-3 w-3"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                          />
                        </svg>
                        <span>Saving…</span>
                      </div>
                    ) : saveError ? (
                      <span className="text-red-500 font-medium">
                        Save failed
                      </span>
                    ) : lastSavedAt ? (
                      <span className="text-gray-500">
                        Saved{" "}
                        {new Date(
                          lastSavedAt
                        ).toLocaleTimeString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        Not saved
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className="border-b border-gray-200 mb-4" />

            {/* Content / Editor */}
            <div className="flex-1 overflow-auto">
              {loadingDoc ? (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader message='Loading document preview...' />
                    <div>
                    </div>
                  </div>
                </div>
              ) : docError ? (
                <div className="text-center py-8">
                  <div className="max-w-xl mx-auto bg-red-50 border border-red-100 rounded-lg p-6">
                    <div className="text-red-700 font-semibold mb-2">Failed to load document</div>
                    <div className="text-sm text-red-600 mb-4">{docError}</div>
                    <div className="flex items-center justify-center gap-3">
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
              ) : docData && contentForEditor ? (
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
                    console.log('Editor ready:', editor);
                    try {
                      isApplyingRef.current = true;
                      applyFormDataToEditor(editor);
                      // compute editableField positions/counts right after editor is ready
                      try { computeDuplicatePositions(editor); } catch (e) { /* ignore */ }
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
                              // translate original key -> label if mapping exists
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

                              computeDuplicatePositions(
                                editor
                              );
                            } catch (err) {
                              console.debug(
                                "error reading editableField from editor",
                                err
                              );
                            }
                          },
                          150
                        );
                      });
                    }}
                    onContentChange={() => {}}
                  />
                ) : (
                  <div className="text-center py-8">
                    <div className="max-w-lg mx-auto bg-yellow-50 border border-yellow-100 rounded-lg p-6">
                      <div className="text-yellow-800 font-semibold mb-2">No document preview available</div>
                      <div className="text-sm text-yellow-700 mb-4">This document doesn't contain a previewable page or the editor content could not be rendered. You can still edit fields or try reloading the document.</div>
                      <div className="flex items-center justify-center gap-3">
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLEAR ALL MODAL */}
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
              Are you sure you want to clear all form data?
              This action cannot be undone.
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

      {/* AUTOFILL MODAL */}
      <AutofillModal
        open={autofillOpen}
        onClose={() => setAutofillOpen(false)}
        fields={
          panelsToUse
            ? panelsToUse.flatMap((p) => p.fields || [])
            : []
        }
        fetchPreview={fetchPreview}
        onApply={handleApplyAutofill}
        applying={autofillApplying}
        user={user}
        matchMode={matchMode}
        onChangeMatchMode={setMatchMode}
      />

      {/* DOWNLOADING MODAL */}
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
    </>
  );
}
