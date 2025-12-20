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
  Plus,
  Eye,
  EyeOff,
  Layers,
  FileType,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import Loader from "../components/loader";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import OfflineIndicator from "../components/offlineIndicator";
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
  const [zoom, setZoom] = useState(100);
  
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
  const [tableFieldsMap, setTableFieldsMap] = useState({});
  // Track table structure for precise row operations
  const tablesInfoRef = useRef([]);
  // Track max used index per base label for each table
  const labelCountersRef = useRef({});
  // Track keys of rows added at runtime per tableIdx
  const addedRowsRef = useRef({});

  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);
  // autosave/tracking refs
  const initialLoadRef = useRef(true); // suppress autosave on first load
  const lastSavedRef = useRef({});
  const autosaveTimerRef = useRef(null); // debounce handle for autosave
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

  const handleZoomIn = () => setZoom(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 10));
  const handleZoomReset = () => setZoom(100);

  // ========================================
  // TABLE ROW DETECTION & ADDITION
  // ========================================
  
  const checkCanAddRow = (editor) => {
    if (!editor) {
      console.log("[checkCanAddRow] No editor available");
      return;
    }
    
    console.log("[checkCanAddRow] Starting detection...");
    const doc = editor.state.doc;
    
    // Check if document has content
    if (doc.content.size === 0) {
      console.log("[checkCanAddRow] Document is empty, skipping detection");
      return;
    }
    
    // Debug: Log all node types
    const allNodeTypes = new Set();
    const allNodes = [];
    doc.descendants((node) => {
      allNodeTypes.add(node.type.name);
      allNodes.push({ type: node.type.name, attrs: node.attrs });
    });
    console.log("[checkCanAddRow] All node types in document:", Array.from(allNodeTypes));
    console.log("[checkCanAddRow] All nodes:", allNodes);
    
    const tables = [];
    
    // Try multiple possible table node names
    const tableNodeNames = ["table", "Table", "TableRow", "tableRow"];
    
    doc.descendants((node, pos) => {
      if (tableNodeNames.includes(node.type.name) || node.type.name.toLowerCase().includes("table")) {
        console.log(`[checkCanAddRow] Found potential table node: ${node.type.name}`);
        if (node.type.name === "table" || node.type.name === "Table") {
          tables.push({ node, pos });
        }
      }
    });
    
    console.log(`[checkCanAddRow] Found ${tables.length} tables`);
    console.log("[checkCanAddRow] Table nodes:", tables);
    
    if (tables.length === 0) {
      console.log("[checkCanAddRow] No tables found");
      setTableFieldsMap({});
      return;
    }
    
    const k2l = lastSavedRef.current?.__keyToLabel || {};
    const fieldsMap = {};
    const tablesInfo = [];
    
    tables.forEach((tableInfo, tableIdx) => {
      console.log(`[checkCanAddRow] Scanning table ${tableIdx}...`);
      const editableFieldsInTable = [];

      // Build rows/cells info for this table
      const tablePosAbs = tableInfo.pos;
      const rows = [];
      tableInfo.node.descendants((rowNode, rowRelPos) => {
        if (rowNode.type && rowNode.type.name && rowNode.type.name.toLowerCase().includes("row")) {
          const rowPosAbs = tablePosAbs + 1 + rowRelPos;
          const cells = [];
          rowNode.descendants((cellNode, cellRelPos) => {
            if (cellNode.type && cellNode.type.name && cellNode.type.name.toLowerCase().includes("cell")) {
              const cellPosAbs = rowPosAbs + 1 + cellRelPos;
              let fieldKeyInCell = null;
              let fieldLabelInCell = null;
              let fieldTypeInCell = null;
              let fieldPlaceholderInCell = null;
              // find first editableField within the cell
              cellNode.descendants((nodeInside) => {
                if (nodeInside.type && nodeInside.type.name === "editableField") {
                  const fk = nodeInside.attrs?.key;
                  if (fk && !fieldKeyInCell) {
                    fieldKeyInCell = fk;
                    fieldLabelInCell = k2l[fk] || fk;
                    fieldTypeInCell = nodeInside.attrs?.type || "text";
                    fieldPlaceholderInCell = nodeInside.attrs?.placeholder || fieldLabelInCell || "";
                  }
                }
              });
              if (fieldKeyInCell) {
                editableFieldsInTable.push(fieldKeyInCell);
                fieldsMap[fieldKeyInCell] = {
                  tableIdx,
                  fieldName: fieldLabelInCell,
                  fieldKey: fieldKeyInCell,
                };
              }
              cells.push({
                pos: cellPosAbs,
                fieldKey: fieldKeyInCell,
                fieldLabel: fieldLabelInCell,
                fieldType: fieldTypeInCell,
                fieldPlaceholder: fieldPlaceholderInCell,
              });
            }
          });
          rows.push({ pos: rowPosAbs, cells });
        }
      });

      tablesInfo.push({ pos: tablePosAbs, rows });
      console.log(`[checkCanAddRow] Table ${tableIdx} has ${editableFieldsInTable.length} editable fields`);
    });
    
    console.log("[checkCanAddRow] Final fieldsMap:", fieldsMap);
    // Merge detection results with any existing mappings (e.g., newly added fields)
    setTableFieldsMap((prev) => {
      const merged = { ...fieldsMap };
      Object.keys(prev || {}).forEach((k) => {
        if (!merged[k]) merged[k] = prev[k];
      });
      return merged;
    });
    tablesInfoRef.current = tablesInfo;
    // Build counters per table based on detected labels
    try {
      const counters = {};
      tablesInfo.forEach((t, tIdx) => {
        const c = (counters[tIdx] = {});
        (t.rows || []).forEach((r) => {
          (r.cells || []).forEach((cell) => {
            const lbl = cell.fieldLabel;
            if (!lbl) return;
            const m = lbl.match(/^(.*?)(?:\s*-\s*\((\d+)\))$/);
            if (m) {
              const base = m[1].trim();
              const n = parseInt(m[2], 10);
              if (!isNaN(n)) {
                c[base] = Math.max(c[base] || 0, n);
              }
            }
          });
        });
      });
      labelCountersRef.current = counters;
    } catch (_) {}
  };
  
  const addTableRow = (targetTableIdx) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    console.log(`[addTableRow] Adding row to table ${targetTableIdx}`);
    // Determine last row cells for this table
    const tInfo = tablesInfoRef.current?.[targetTableIdx];
    if (!tInfo || !Array.isArray(tInfo.rows) || tInfo.rows.length === 0) {
      console.log("[addTableRow] No table info available or rows missing");
      return;
    }
    const lastRow = tInfo.rows[tInfo.rows.length - 1];
    const lastCells = Array.isArray(lastRow.cells) ? lastRow.cells : [];
    const columns = lastCells.length;
    console.log(`[addTableRow] Last row has ${columns} columns`);
    if (columns === 0) {
      console.log("[addTableRow] Last row has no cells");
      return;
    }
    
    const k2l = lastSavedRef.current?.__keyToLabel || {};
    const l2k = {};
    Object.keys(k2l).forEach((k) => {
      l2k[k2l[k]] = k;
    });
    
    const newFieldsForForm = [];
    // Build key->panel label map from the current section to prefer human labels
    const keyToPanelLabel = {};
    try {
      const secFields = (sections[currentSection]?.fields) || [];
      secFields.forEach((f) => {
        if (f && f._originalKey) {
          keyToPanelLabel[f._originalKey] = f.label || f.name;
        }
      });
    } catch (_) {}

    // Build new labels/keys based on last row's cell labels with bracketed suffix ` - (n)`
    lastCells.forEach((cell, idx) => {
      const baseSource = keyToPanelLabel[cell.fieldKey] || cell.fieldLabel || cell.fieldPlaceholder || `Field ${idx + 1}`;
      const baseMatch = baseSource.match(/^(.*?)(?:\s*-\s*\((\d+)\))$/);
      const baseLabel = baseMatch ? baseMatch[1].trim() : baseSource.trim();
      // Determine next index using counters + live scans
      const countersForTable = (labelCountersRef.current?.[targetTableIdx]) || {};
      let maxIndex = countersForTable[baseLabel] || 0;
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patt = new RegExp(`^${esc(baseLabel)}\\s*-\\s*\\((\\d+)\\)$`);
      // Scan formData keys
      Object.keys(formData || {}).forEach((k) => {
        const m = k.match(patt);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxIndex) maxIndex = n;
        }
      });
      // Scan current section field names (runtime panels)
      try {
        const secFields = (sections[currentSection]?.fields) || [];
        secFields.forEach((f) => {
          const nm = f?.name || f?.label;
          if (!nm) return;
          const m = String(nm).match(patt);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxIndex) maxIndex = n;
          }
        });
      } catch (_) {}
      // Scan labels of previously added rows in this table
      try {
        const addedRows = addedRowsRef.current?.[targetTableIdx] || [];
        const k2l = lastSavedRef.current?.__keyToLabel || {};
        addedRows.flat().forEach((key) => {
          const lbl = k2l[key];
          if (!lbl) return;
          const m = lbl.match(patt);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxIndex) maxIndex = n;
          }
        });
      } catch (_) {}
      const newIndex = maxIndex + 1; // start at 1 when none exist
      const newLabel = `${baseLabel} - (${newIndex})`;

      console.log(`[addTableRow] Creating: ${baseSource} -> ${newLabel}`);
      const newKey = `fld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      k2l[newKey] = newLabel;
      l2k[newLabel] = newKey;
      const fieldType = cell.fieldType || "text";
      const placeholder = newLabel;
      newFieldsForForm.push({
        _originalKey: newKey,
        name: newLabel,
        label: newLabel,
        type: fieldType === "text" ? "input" : fieldType,
        placeholder,
        instructions: "",
      });
      setFormData((prev) => ({ ...(prev || {}), [newLabel]: "" }));
      // Update counters
      countersForTable[baseLabel] = newIndex;
      if (!labelCountersRef.current) labelCountersRef.current = {};
      labelCountersRef.current[targetTableIdx] = countersForTable;
    });
    
    lastSavedRef.current.__keyToLabel = k2l;
    
    // Update runtime panels so the new fields render in the current section
    setPanelsRuntime((prevPanels) => {
      const basePanels = Array.isArray(prevPanels) ? [...prevPanels] : [...(panelsFromTemplate || [])];
      const currentPanelIndex = currentSection;
      if (basePanels[currentPanelIndex]) {
        basePanels[currentPanelIndex] = {
          ...basePanels[currentPanelIndex],
          fields: [...(basePanels[currentPanelIndex].fields || []), ...newFieldsForForm]
        };
      }
      return basePanels;
    });

    // Also update tableFieldsMap so the new fields are treated as belonging to this table
    setTableFieldsMap((prev) => {
      const next = { ...(prev || {}) };
      newFieldsForForm.forEach((f) => {
        next[f._originalKey] = {
          tableIdx: targetTableIdx,
          fieldName: f.label,
          fieldKey: f._originalKey,
        };
      });
      return next;
    });

    // Track the added row keys for safe removal later
    try {
      const keysForRow = newFieldsForForm.map((f) => f._originalKey).filter(Boolean);
      if (!Array.isArray(addedRowsRef.current[targetTableIdx])) addedRowsRef.current[targetTableIdx] = [];
      addedRowsRef.current[targetTableIdx].push(keysForRow);
    } catch (_) {}

    // Reflect in TipTap: add a new row after last row and populate cells
    try {
      // Move selection to the last cell to ensure addRowAfter targets the final row
      const lastCellPos = lastCells[lastCells.length - 1]?.pos || lastRow.pos;
      if (typeof editor.commands.setTextSelection === "function") {
        editor.commands.setTextSelection(lastCellPos);
      }
      if (typeof editor.commands.addRowAfter === "function") {
        editor.commands.addRowAfter();
      }
      // Recompute tables info to get the newly added row
      setTimeout(() => {
        checkCanAddRow(editor);
        const tInfo2 = tablesInfoRef.current?.[targetTableIdx];
        const newLastRow = tInfo2 && tInfo2.rows && tInfo2.rows[tInfo2.rows.length - 1];
        const newCells = (newLastRow && Array.isArray(newLastRow.cells)) ? newLastRow.cells : [];
        // Insert editable fields into each new cell
        newFieldsForForm.forEach((nf, idx) => {
          const cellPos = newCells[idx]?.pos;
          if (!cellPos) return;
          try {
            if (typeof editor.commands.setTextSelection === "function") {
              editor.commands.setTextSelection(cellPos);
            }
            if (typeof editor.commands.insertEditableField === "function") {
              editor.commands.insertEditableField({
                key: nf._originalKey,
                type: nf.type === "input" ? "text" : nf.type,
                placeholder: nf.placeholder || nf.label,
                tags: [],
              });
            }
          } catch (e) {
            console.debug("[addTableRow] Failed to insert field into cell", e);
          }
        });
      }, 50);
    } catch (e) {
      console.debug("[addTableRow] TipTap row insertion failed", e);
    }
    
    console.log(`[addTableRow] Added ${newFieldsForForm.length} new fields`);
    
    setTimeout(() => {
      checkCanAddRow(editor);
    }, 100);
  };

  const removeLastTableRow = (targetTableIdx) => {
    const editor = editorRef.current;
    if (!editor) return;
    console.log(`[removeLastTableRow] Removing last row from table ${targetTableIdx}`);
    const tInfo = tablesInfoRef.current?.[targetTableIdx];
    const addedRows = addedRowsRef.current?.[targetTableIdx] || [];
    if (!tInfo || !Array.isArray(tInfo.rows) || tInfo.rows.length === 0) {
      console.log("[removeLastTableRow] No table info or rows present");
      return;
    }
    if (!Array.isArray(addedRows) || addedRows.length === 0) {
      console.log("[removeLastTableRow] No added rows to remove – original rows are protected");
      return;
    }
    const lastRow = tInfo.rows[tInfo.rows.length - 1];
    const cells = Array.isArray(lastRow.cells) ? lastRow.cells : [];
    const keysToRemove = addedRows.pop();

    // Update runtime panels: remove fields matching cell keys
    setPanelsRuntime((prevPanels) => {
      const basePanels = Array.isArray(prevPanels) ? [...prevPanels] : [...(panelsFromTemplate || [])];
      const currentPanelIndex = currentSection;
      if (basePanels[currentPanelIndex]) {
        const origFields = basePanels[currentPanelIndex].fields || [];
        basePanels[currentPanelIndex] = {
          ...basePanels[currentPanelIndex],
          fields: origFields.filter((f) => !keysToRemove.includes(f._originalKey)),
        };
      }
      return basePanels;
    });

    // Update form data: drop values for those labels
    const k2l = lastSavedRef.current?.__keyToLabel || {};
    setFormData((prev) => {
      const next = { ...(prev || {}) };
      keysToRemove.forEach((k) => {
        const label = k2l[k] || k;
        if (Object.prototype.hasOwnProperty.call(next, label)) delete next[label];
      });
      return next;
    });

    // Update key→label map
    const nextK2L = { ...(k2l || {}) };
    keysToRemove.forEach((k) => { delete nextK2L[k]; });
    lastSavedRef.current.__keyToLabel = nextK2L;

    // Update tableFieldsMap
    setTableFieldsMap((prev) => {
      const next = { ...(prev || {}) };
      keysToRemove.forEach((k) => { delete next[k]; });
      return next;
    });

    // TipTap: delete the row
    try {
      const selectPos = cells[cells.length - 1]?.pos || lastRow.pos;
      if (typeof editor.commands.setTextSelection === "function") {
        editor.commands.setTextSelection(selectPos);
      }
      if (typeof editor.commands.deleteRow === "function") {
        editor.commands.deleteRow();
      }
      setTimeout(() => checkCanAddRow(editor), 50);
    } catch (e) {
      console.debug("[removeLastTableRow] TipTap row deletion failed", e);
    }
    // Adjust counters for removed labels
    try {
      const countersForTable = (labelCountersRef.current?.[targetTableIdx]) || {};
      keysToRemove.forEach((k) => {
        const lbl = nextK2L[k];
        if (!lbl) return;
        const m = lbl.match(/^(.*?)(?:\s*-\s*\((\d+)\))$/);
        if (m) {
          const base = m[1].trim();
          const n = parseInt(m[2], 10);
          if (!isNaN(n) && countersForTable[base] === n) {
            countersForTable[base] = Math.max(0, n - 1);
          }
        }
      });
      labelCountersRef.current[targetTableIdx] = countersForTable;
    } catch (_) {}
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

  // Keep a mutable runtime copy of panels so we can append new fields (e.g., Add Row)
  const [panelsRuntime, setPanelsRuntime] = useState(null);
  useEffect(() => {
    // Initialize or refresh runtime panels when template panels change
    if (panelsFromTemplate && !panelsRuntime) {
      setPanelsRuntime(panelsFromTemplate);
    }
    // If panelsFromTemplate changes later, refresh runtime while preserving user-added fields when possible
    // For simplicity, if runtime is null or emptied, rehydrate from template
    if (panelsFromTemplate && Array.isArray(panelsFromTemplate) && Array.isArray(panelsRuntime) === false) {
      setPanelsRuntime(panelsFromTemplate);
    }
  }, [panelsFromTemplate]);

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
  // AUTO-REFRESH ON SYNC
  // ---------------------------
  useEffect(() => {
    if (!id) return;

    const handleSynced = (event) => {
      const syncedDocs = event.detail?.syncedDocuments || [];
      if (syncedDocs.includes(id)) {
        console.log('[EditableFields] Document synced, reloading...', id);
        // Increment reload counter to trigger document reload
        setReloadCounter(prev => prev + 1);
      }
    };

    window.addEventListener('offline:synced', handleSynced);
    return () => window.removeEventListener('offline:synced', handleSynced);
  }, [id]);

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
          // Detect tables after data is applied
          setTimeout(() => {
            checkCanAddRow(editorRef.current);
          }, 200);
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

  // Prefer runtime panels if available; fall back to template panels
  const sections = panelsRuntime || panelsFromTemplate || [];
  const currentSectionData = sections[currentSection] || { title: "", fields: [] };
  const totalSections = sections.length;

  const totalQuestions = sections.reduce((acc, s) => acc + (s.fields?.length || 0), 0);

  if (loadingDoc) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader message="Loading document..." />
      </div>
    );
  }

  if (docError) {
    return (
      <div className="min-h-screen bg-white">
      <EditableFieldsHeader
        title="Error"
        user={user}
        setTitle={() => {}}
        saving={false}
        lastSavedAt={null}
        dirty={false}
        documentId={id}
        onExportPDF={handleExportPDF}
        onExportDocx={handleExportDocx}
        documentData={docData}
        onDocumentUpdate={() => {}}
        mobileSidebarOpen={false}
        setMobileSidebarOpen={() => {}}
      />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Hard Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Offline Indicator */}
      <OfflineIndicator className="fixed top-30 right-4 z-50" />
      
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

      {/* Hidden Preview Editor - Always render for table detection and preloading */}
      <div className="hidden">
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
              checkCanAddRow(editor);
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
                  checkCanAddRow(editor);
                } catch (err) {
                  console.debug("error reading editableField from editor", err);
                }
              }, 150);
            });
          }}
          onContentChange={() => {}}
        />
      </div>

      <div className="max-w-[800px] mx-auto px-4 py-8">
        {showPreview ? (
          /* Preview Mode */
          <>
            {/* Preview Controls */}
            <div className="bg-white rounded-t-lg border border-gray-300 px-6 py-3 flex items-center justify-between">
              <button
                onClick={() => setShowPreview(false)}
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Form
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut size={20} className="text-gray-700" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-3 py-1 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 min-w-[60px] transition-colors"
                  title="Reset zoom"
                >
                  {zoom}%
                </button>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn size={20} className="text-gray-700" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <button
                  onClick={() => setZoom(100)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Fit to width"
                >
                  <Maximize2 size={20} className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Preview Mode */}
            <div className="bg-white rounded-b-lg border-x border-b border-gray-300 p-8 overflow-auto">
              <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
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
                        checkCanAddRow(editor);
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
          </>
        ) : (
          /* Form Mode */
          <>
              {/* Form Header */}
              <div className="bg-white rounded-lg border-t-8 border-[#0035DA] mb-3 overflow-hidden">
                <div className="p-6 md:p-8">
                  <h1 className="text-3xl md:text-4xl font-normal text-gray-900 mb-2">
                    {docData?.title || "Untitled Form"}
                  </h1>
                  {docData?.description && (
                    <p className="text-sm text-gray-700 mb-4">{docData.description}</p>
                  )}
                  
                  {/* Form Info */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileType className="w-4 h-4 text-[#0035DA]" />
                        <span>{totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0035DA]"/>
                        <span>{totalSections} {totalSections === 1 ? 'section' : 'sections'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
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
                </div>

            {/* Section Title (if multiple sections) */}
            {totalSections > 1 && (
              <div className="bg-white rounded-lg p-6 mb-3">
                <h2 className="text-xl font-normal text-gray-900">{currentSectionData.title}</h2>
                {currentSectionData.subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{currentSectionData.subtitle}</p>
                )}
              </div>
            )}

                {/* Form Fields - Show FIRST (regular non-table fields) */}
                <div className="space-y-3">
                  {currentSectionData.fields && currentSectionData.fields.filter(field => {
                    const fieldKey = field._originalKey;
                    return !fieldKey || !tableFieldsMap[fieldKey];
                  }).map((field, idx) => {
                    let displayName = field.name;
                    if (typeof displayName === 'string' && displayName.startsWith('fld-')) {
                      const fallback = field.label && !field.label.startsWith('fld-') ? field.label : (field.placeholder || field.name);
                      displayName = fallback;
                    }
                    const value = formData[displayName] || "";
                    const isDuplicate = duplicateCounts[field.name] > 1;
                    const currentDupIndex = duplicateIndices[field.name] || 0;
                    
                    return (
                      <div 
                        key={idx}
                        className="bg-white rounded-lg border border-gray-300 hover:border-gray-400 transition-all p-6 focus-within:border-blue-600 focus-within:shadow-md group relative"
                  >
                    {/* Form FieldLabel with Tooltip */}
                    <div className="mb-4">
                      <div className="flex items-start gap-2 mb-2">
                        <label className="text-base text-gray-900 flex-1">
                          {displayName}
                          {field.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        
                            {isDuplicate && (
                              <div className="flex items-center gap-1">
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
                                  className={`p-1 rounded transition-colors ${
                                    currentDupIndex === 0
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-500 px-2">
                                  {currentDupIndex + 1}/{duplicateCounts[field.name]}
                                </span>
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
                                  className={`p-1 rounded transition-colors ${
                                    currentDupIndex >= duplicateCounts[field.name] - 1
                                      ? 'text-gray-300 cursor-not-allowed'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                          )}
                        </div>
                        
                        {field.instructions && (
                          <p className="text-sm text-gray-600">{field.instructions}</p>
                            )}
                          </div>

                          {/* Field Input */}
                          <div>
                            {field.type === 'input' ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleInputChange(displayName, e.target.value)}
                                  placeholder={field.placeholder || 'Your answer'}
                                  className="w-full px-0 py-2 border-0 border-b border-gray-300 focus:border-blue-600 outline-none transition-colors text-gray-900 placeholder-gray-400 bg-transparent"
                                />
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={value}
                                onChange={(e) => handleInputChange(displayName, e.target.value)}
                                placeholder={field.placeholder || 'Your answer'}
                                rows={4}
                                className="w-full px-0 py-2 border-0 border-b border-gray-300 focus:border-blue-600 outline-none transition-colors resize-y text-gray-900 placeholder-gray-400 bg-transparent"
                              />
                            ) : field.type === 'date' ? (
                                <input
                                  type="date"
                                  value={value}
                                  onChange={(e) => handleInputChange(displayName, e.target.value)}
                                  className="w-full px-0 py-2 border-0 border-b border-gray-300 focus:border-blue-600 outline-none transition-colors text-gray-900 bg-transparent"
                                />
                            ) : null}

                        {/* Character Count for Textarea */}
                        {field.type === 'textarea' && value && (
                          <div className="text-xs text-gray-500 text-right mt-1">
                              {value.length} characters
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>

            {/* Table Fields - Show AFTER regular fields with actual inputs inside table boxes */}
            {Object.keys(tableFieldsMap).length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4"> Tables in Document</h3>
                {Object.values(tableFieldsMap).reduce((unique, item) => {
                  if (!unique.some(u => u.tableIdx === item.tableIdx)) {
                    unique.push(item);
                  }
                  return unique;
                }, []).map((item) => {
                  const tableFieldKeys = Object.values(tableFieldsMap)
                    .filter(f => f.tableIdx === item.tableIdx)
                    .map(f => f.fieldKey);
                  
                  const tableFieldObjects = currentSectionData.fields
                    ?.filter(field => field._originalKey && tableFieldKeys.includes(field._originalKey)) || [];
                  
                  return (
                    <div key={item.tableIdx} className="border-2 border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-blue-900">Table {item.tableIdx + 1}</h4>
                        <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">
                          {tableFieldObjects.length} fields
                        </span>
                      </div>
                      
                      <div className="bg-white rounded-lg border-2 border-blue-200 p-4 mb-3">
                        <div className="flex items-start gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            <strong>Fields in this table:</strong> Fill out these fields, then click "Add Row" to create more rows.
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          {tableFieldObjects.map((field, idx) => {
                            let displayName = field.name;
                            if (typeof displayName === 'string' && displayName.startsWith('fld-')) {
                              const fallback = field.label && !field.label.startsWith('fld-') ? field.label : (field.placeholder || field.name);
                              displayName = fallback;
                            }
                            const value = formData[displayName] || "";
                            return (
                              <div key={idx} className="bg-gray-50 border border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-all">
                                <label className="text-sm font-semibold text-gray-800 mb-2 block">
                                  {displayName}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                {field.instructions && (
                                  <p className="text-xs text-blue-700 mb-2 bg-blue-50 p-2 rounded border border-blue-200">{field.instructions}</p>
                                )}
                                
                                {field.placeholder && !field.instructions && (
                                  <p className="text-xs text-gray-500 mb-2 italic">Example: {field.placeholder}</p>
                                )}
                                
                                <div>
                                  {field.type === 'input' || field.type === 'text' ? (
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => handleInputChange(displayName, e.target.value)}
                                      placeholder={field.placeholder || 'Your answer'}
                                      className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors text-gray-900 placeholder-gray-400 bg-white"
                                    />
                                  ) : field.type === 'textarea' ? (
                                    <textarea
                                      value={value}
                                      onChange={(e) => handleInputChange(displayName, e.target.value)}
                                      placeholder={field.placeholder || 'Your answer'}
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors resize-y text-gray-900 placeholder-gray-400 bg-white"
                                    />
                                  ) : field.type === 'date' ? (
                                    <input
                                      type="date"
                                      value={value}
                                      onChange={(e) => handleInputChange(displayName, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors text-gray-900 bg-white"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => addTableRow(item.tableIdx)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                          Add New Row
                        </button>
                        <button
                          onClick={() => removeLastTableRow(item.tableIdx)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V6a2 2 0 012-2h3a2 2 0 012 2v1m-7 0h8" />
                          </svg>
                          Remove Last Row
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-2 text-center italic">
                        New row mirrors last row’s columns with incremented labels.
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

                {/* Navigation Footer */}
                {totalSections > 0 && (
                    <div className="bg-white rounded-lg border border-gray-300 p-4 mt-6 flex items-center justify-between">
                      <button
                        onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
                        disabled={currentSection === 0}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                          currentSection === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>

                    <span className="text-sm text-gray-600">
                      Page {currentSection + 1} of {totalSections}
                    </span>

                      <button
                        onClick={() => setCurrentSection(prev => Math.min(totalSections - 1, prev + 1))}
                        disabled={currentSection === totalSections - 1}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                          currentSection === totalSections - 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-white bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                )}

                {/* Progress Bar */}
                {totalSections > 1 && (
                  <div className="mt-4 bg-white rounded-lg border border-gray-300 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium text-blue-600">
                        {Math.round(((currentSection + 1) / totalSections) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
        </>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <div
          className="fixed inset-0 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
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
  </div>
  );
}