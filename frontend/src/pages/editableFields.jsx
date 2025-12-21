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
import axios from "axios";
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
import AddRowOverlay from "../components/loader/AddRowOverlay";
import EditableFieldsHeader from "../layout/editable_fields/editableFieldsHeader";
import OfflineIndicator from "../components/offlineIndicator";
import useUser from "../hooks/useUser";
import TextEditor from "../layout/create_template/textEditor";
import fetchAndNormalizeDocument from "../utils/documentLoader";
import {
  updateDocumentFieldValuesAPI,
  getFieldSuggestionsAPI,
  saveFieldSuggestionAPI,
  updateDocumentFromTemplateAPI,
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
  const [tableDiscoveredFields, setTableDiscoveredFields] = useState({});
  // Track table structure for precise row operations
  const tablesInfoRef = useRef([]);
  // Track max used index per base label for each table
  const labelCountersRef = useRef({});
  // Track keys of rows added at runtime per tableIdx
  const addedRowsRef = useRef({});
  // Map field ID to label for quick lookup (field.id → field.label)
  const fieldIdToLabelRef = useRef({});

  const isApplyingRef = useRef(false);
  const updateTimerRef = useRef(null);
  // autosave/tracking refs
  const initialLoadRef = useRef(true); // suppress autosave on first load
  const lastSavedRef = useRef({});
  const autosaveTimerRef = useRef(null); // debounce handle for autosave
  const [reloadCounter, setReloadCounter] = useState(0);
  // Show a full-screen overlay while adding a table row
  const [addingRow, setAddingRow] = useState(false);

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

  // Persist current editor structure into from_template.pages_json and update from_template.fields
  const persistFromTemplateAfterChange = (note, mutateFieldsFn) => {
    try {
      const editor = editorRef.current;
      const idToUse = docData?._id || docData?.document?._id || id;
      if (!editor || !idToUse) return;
      const docJson = editor.state?.doc?.toJSON?.();
      if (!docJson) return;

      // Build updated fields starting from docData.from_template.fields
      const currentFields = Array.isArray(docData?.from_template?.fields) ? JSON.parse(JSON.stringify(docData.from_template.fields)) : [];
      let updatedFields = currentFields;
      if (typeof mutateFieldsFn === 'function') {
        updatedFields = mutateFieldsFn(currentFields) || currentFields;
      }

      const fromTemplatePayload = {
        pages_json: [docJson],
        fields: updatedFields,
      };

      // Fire-and-forget; UI stays responsive
      updateDocumentFromTemplateAPI(idToUse, fromTemplatePayload, note).catch((e) => {
        console.debug('[from-template] persist failed', e?.message || e);
      });
    } catch (e) {
      console.debug('[from-template] persist error', e?.message || e);
    }
  };
  
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
    const discovered = {};
    
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
              let fieldGroupIdInCell = null;
              let fieldDateFormatInCell = null;
              // find first editableField within the cell
              cellNode.descendants((nodeInside) => {
                if (nodeInside.type && nodeInside.type.name === "editableField") {
                  const fk = nodeInside.attrs?.key;
                  if (fk && !fieldKeyInCell) {
                    fieldKeyInCell = fk;
                    fieldLabelInCell = k2l[fk] || fk;
                    fieldTypeInCell = nodeInside.attrs?.type || "text";
                    fieldPlaceholderInCell = nodeInside.attrs?.placeholder || fieldLabelInCell || "";
                    fieldGroupIdInCell = nodeInside.attrs?.groupId || null;
                    fieldDateFormatInCell = nodeInside.attrs?.dateFormat || null;
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
                if (!discovered[fieldKeyInCell]) {
                  discovered[fieldKeyInCell] = {
                    label: fieldLabelInCell || fieldPlaceholderInCell || fieldKeyInCell,
                    placeholder: fieldPlaceholderInCell || fieldLabelInCell || fieldKeyInCell,
                    type: fieldTypeInCell || 'text',
                    dateFormat: fieldDateFormatInCell || null,
                    groupId: fieldGroupIdInCell || null,
                  };
                }
              }
              cells.push({
                pos: cellPosAbs,
                fieldKey: fieldKeyInCell,
                fieldLabel: fieldLabelInCell,
                fieldType: fieldTypeInCell,
                fieldPlaceholder: fieldPlaceholderInCell,
                fieldGroupId: fieldGroupIdInCell,
                fieldDateFormat: fieldDateFormatInCell,
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
    setTableDiscoveredFields(discovered);
    // Initialize formData for newly discovered fields that lack values
    try {
      setFormData((prev) => {
        const next = { ...(prev || {}) };
        const k2l = lastSavedRef.current?.__keyToLabel || {};
        Object.keys(discovered).forEach((k) => {
          const lbl = k2l[k] || discovered[k].label || k;
          if (next[lbl] === undefined) next[lbl] = '';
        });
        return next;
      });
    } catch (_) {}
    tablesInfoRef.current = tablesInfo;
    // Build counters per table based on detected labels, keyed by field ID
    try {
      const counters = {};
      tablesInfo.forEach((t, tIdx) => {
        const c = (counters[tIdx] = {});
        (t.rows || []).forEach((r) => {
          (r.cells || []).forEach((cell) => {
            const fieldId = cell.fieldKey; // This IS the field ID from template
            const lbl = cell.fieldLabel;
            if (!fieldId || !lbl) return;
            
            // Extract numeric suffix from label
            const m = lbl.match(/^(.*?)(?:\s*-\s*\((\d+)\)|[\s\-\(]*(\d+)\)?)$/);
            if (m) {
              const n = parseInt(m[2] || m[3], 10);
              if (!isNaN(n)) {
                // Track max counter by field ID
                c[fieldId] = Math.max(c[fieldId] || 0, n);
              }
            }
          });
        });
      });
      labelCountersRef.current = counters;
    } catch (_) {}
  };
  
  const addTableRow = async (targetTableIdx) => {
    console.log(`[addTableRow] Adding row to table ${targetTableIdx}`);
    setAddingRow(true);
    const editor = editorRef.current;

    // Refresh detection right away to reduce stale table info
    try {
      if (editor) checkCanAddRow(editor);
    } catch (e) {
      console.debug('[addTableRow] preflight table detection failed', e);
    }
    
    // Get table info to determine field count
    let tInfo = tablesInfoRef.current?.[targetTableIdx];
    if (!tInfo) {
      // One more attempt after detection
      try {
        if (editor) checkCanAddRow(editor);
      } catch (_) {}
      tInfo = tablesInfoRef.current?.[targetTableIdx];
    }
    if (!tInfo || !Array.isArray(tInfo.rows) || tInfo.rows.length === 0) {
      console.log("[addTableRow] No table info available or rows missing");
      // Immediate backend fallback when client-side table detection fails
      try {
        let pagesJsonToSend = docData?.from_template?.pages_json || docData?.pages_json;
        if (!Array.isArray(pagesJsonToSend)) pagesJsonToSend = pagesJsonToSend ? [pagesJsonToSend] : [];
        const fieldsToSend = docData?.from_template?.fields || docData?.metadata?.template_fields || [];
        const response = await axios.patch(
          `${window.location.origin.replace(':3000', ':8000')}/api/documents/${id}/from-template`,
          {
            from_template: {
              pages_json: pagesJsonToSend,
              fields: fieldsToSend,
            },
            operation: {
              type: 'addTableRow',
              tableIndex: targetTableIdx,
              pageIndex: 0,
              newFieldKeys: [], // backend will generate if empty
            },
          },
          { withCredentials: true }
        );
        if (response?.data?.success) {
          console.log('[addTableRow] Backend fallback (no table info) succeeded');
          setReloadCounter((prev) => prev + 1);
          setAddingRow(false);
        }
      } catch (fallbackErr) {
        console.error('[addTableRow] Backend fallback failed when no table info', fallbackErr?.message || fallbackErr);
        setAddingRow(false);
      }
      // End add row flow for no-table-info case
      return;
    }
    const beforeCount = tInfo.rows.length;
    const lastRow = tInfo.rows[tInfo.rows.length - 1];
    const lastCells = Array.isArray(lastRow.cells) ? lastRow.cells : [];
    const columns = lastCells.length;
    console.log(`[addTableRow] Last row has ${columns} columns`);
    if (columns === 0) {
      console.log("[addTableRow] Last row has no cells");
      setAddingRow(false);
      return;
    }
    
    // Use field IDs from the last row (they are template field IDs)
    const fieldIds = lastCells.map(cell => cell.fieldKey).filter(Boolean);
    
    // Try client-side row insertion first (TipTap), then persist to backend
    try {
      const editor = editorRef.current;
      if (editor && typeof editor.commands.addRowAfter === 'function' && typeof editor.commands.setTextSelection === 'function') {
        console.log('[addTableRow] Inserting row via TipTap commands');
        const selectPos = lastCells[lastCells.length - 1]?.pos || lastRow.pos;
        editor.commands.setTextSelection(selectPos);
        editor.commands.addRowAfter();

        // Refresh table info synchronously
        try {
          checkCanAddRow(editor);
        } catch (e) {
          console.debug('[addTableRow] checkCanAddRow after add failed', e);
        }

        // Clone previous row's content into the new row immediately
        try {
          const latestInfo = tablesInfoRef.current?.[targetTableIdx];
          if (!latestInfo || !Array.isArray(latestInfo.rows) || latestInfo.rows.length < 2) {
            console.log('[addTableRow] Not enough rows to clone content');
          } else {
            const prevRow = latestInfo.rows[latestInfo.rows.length - 2];
            const newRow = latestInfo.rows[latestInfo.rows.length - 1];
            const prevCells = Array.isArray(prevRow.cells) ? prevRow.cells : [];
            const newCells = Array.isArray(newRow.cells) ? newRow.cells : [];
            const cloneCount = Math.min(prevCells.length, newCells.length);

            // Helper to deep clone JSON and update editableField keys
            const updateEditableKeys = (jsonNode, key) => {
              const walk = (node) => {
                if (!node || typeof node !== 'object') return;
                if (node.type === 'editableField' && node.attrs) {
                  node.attrs.key = key; // Use the field ID directly
                }
                if (Array.isArray(node.content)) node.content.forEach(walk);
              };
              walk(jsonNode);
              return jsonNode;
            };

            for (let i = 0; i < cloneCount; i++) {
              try {
                const prevPos = prevCells[i]?.pos;
                const newPos = newCells[i]?.pos;
                if (!prevPos || !newPos) continue;

                // Get previous cell node JSON
                const prevCellNode = editor.state.doc.nodeAt(prevPos);
                if (!prevCellNode) continue;
                const prevCellJson = prevCellNode.toJSON();

                // We generally want to clone only the cell's content, not the cell node wrapper
                const contentToInsert = Array.isArray(prevCellJson?.content)
                  ? prevCellJson.content.map((c) => JSON.parse(JSON.stringify(c)))
                  : [];

                // Update editableField key to use the field ID
                const fieldId = prevCells[i]?.fieldKey;
                if (fieldId) {
                  contentToInsert.forEach((n) => updateEditableKeys(n, fieldId));
                }

                // Select inside the new cell and insert cloned content
                editor.commands.setTextSelection(newPos + 1);
                editor.commands.insertContent(contentToInsert);
              } catch (cellErr) {
                console.debug('[addTableRow] Failed to clone content for cell', i, cellErr);
              }
            }

            // Move cursor into first new cell for immediate typing
            if (newCells[0]?.pos) {
              editor.commands.setTextSelection(newCells[0].pos + 1);
            }

            // Re-run detection to update maps after cloning
            try {
              checkCanAddRow(editor);
            } catch (_) {}

            // Append new fields to runtime panels so they show in the form immediately
            try {
              const groupId = prevCells[0]?.fieldGroupId || newCells[0]?.fieldGroupId || null;
              const countersForTable = (labelCountersRef.current?.[targetTableIdx]) || {};
              const newFieldDefs = [];
              
              for (let i = 0; i < cloneCount; i++) {
                // Use the field ID from the previous cell (it's the template field ID)
                const fieldId = prevCells[i]?.fieldKey;
                if (!fieldId) continue;
                
                // Look up the base label from the template using field ID
                const templateLabel = fieldIdToLabelRef.current?.[fieldId] || prevCells[i]?.fieldLabel || fieldId;
                const baseLabel = String(templateLabel).trim();
                
                // Get current counter for this field ID and increment
                const currentMax = countersForTable[fieldId] || 0;
                const nextIndex = currentMax + 1;
                countersForTable[fieldId] = nextIndex;
                
                // Generate incremented label preserving style
                const prevLabel = prevCells[i]?.fieldLabel || baseLabel;
                const prevLabelStr = String(prevLabel).trim();
                const labelMatch = prevLabelStr.match(/^(.*?)(?:\s*-\s*\((\d+)\)|[\s\-\(]*(\d+)\)?)$/);
                
                let label;
                if (labelMatch) {
                  const base = labelMatch[1].trim();
                  const hadParenStyle = /\(/.test(prevLabelStr);
                  const hadDashParenStyle = /-\s*\(/.test(prevLabelStr);
                  const hadSpaceNumberStyle = /\s\d+$/.test(prevLabelStr) && !hadParenStyle;
                  
                  if (hadDashParenStyle) {
                    label = `${base} - (${nextIndex})`;
                  } else if (hadParenStyle) {
                    label = `${base} (${nextIndex})`;
                  } else if (hadSpaceNumberStyle) {
                    label = `${base} ${nextIndex}`;
                  } else {
                    label = `${base} (${nextIndex})`;
                  }
                } else {
                  // No number in label yet, default style based on base label
                  label = `${baseLabel} (${nextIndex})`;
                }
                
                const typeRaw = prevCells[i]?.fieldType || 'text';
                const type = (typeRaw === 'text' ? 'input' : typeRaw);
                const placeholder = prevCells[i]?.fieldPlaceholder || baseLabel;
                const def = {
                  type,
                  name: label,
                  _originalKey: fieldId, // Use field ID directly
                  label,
                  placeholder,
                  instructions: '',
                  dateFormat: prevCells[i]?.fieldDateFormat || null,
                  required: false,
                  options: null,
                  tags: [],
                };
                newFieldDefs.push(def);
                // Update key→label mapping for the field ID with its new label
                const k2l = lastSavedRef.current.__keyToLabel || {};
                k2l[fieldId] = label;
                lastSavedRef.current.__keyToLabel = k2l;
              }
              labelCountersRef.current[targetTableIdx] = countersForTable;

              setPanelsRuntime((prevPanels) => {
                const basePanels = Array.isArray(prevPanels) ? [...prevPanels] : [...(panelsFromTemplate || [])];
                // Try to locate panel by section id (groupId)
                let targetPanelIdx = basePanels.findIndex((p) => p && p.id && groupId && String(p.id) === String(groupId));
                if (targetPanelIdx < 0) {
                  // Fallback: use current section
                  targetPanelIdx = currentSection;
                }
                if (basePanels[targetPanelIdx]) {
                  const origFields = Array.isArray(basePanels[targetPanelIdx].fields) ? basePanels[targetPanelIdx].fields : [];
                  basePanels[targetPanelIdx] = {
                    ...basePanels[targetPanelIdx],
                    fields: [...origFields, ...newFieldDefs],
                  };
                }
                return basePanels;
              });

              // Initialize formData entries for the new labels
              setFormData((prev) => {
                const next = { ...(prev || {}) };
                newFieldDefs.forEach((f) => {
                  if (next[f.label] === undefined) next[f.label] = '';
                });
                return next;
              });
            } catch (panelErr) {
              console.debug('[addTableRow] Failed to append new fields to panels', panelErr);
            }

            // Track added row keys for potential removal
            addedRowsRef.current[targetTableIdx] = [
              ...((addedRowsRef.current[targetTableIdx]) || []),
              newFieldKeys,
            ];

            // Verify row count increased; if not, fallback to backend operation
            const afterInfo = tablesInfoRef.current?.[targetTableIdx];
            const afterCount = Array.isArray(afterInfo?.rows) ? afterInfo.rows.length : beforeCount;
            if (afterCount <= beforeCount) {
              console.log('[addTableRow] Row did not register client-side; falling back to backend operation');
              // Ensure pages_json is an array
              let pagesJsonToSend = docData?.from_template?.pages_json || docData?.pages_json;
              if (!Array.isArray(pagesJsonToSend)) {
                pagesJsonToSend = pagesJsonToSend ? [pagesJsonToSend] : [];
              }
              const fieldsToSend = docData?.from_template?.fields || docData?.metadata?.template_fields || [];
              try {
                const response = await axios.patch(
                  `${window.location.origin.replace(':3000', ':8000')}/api/documents/${id}/from-template`,
                  {
                    from_template: {
                      pages_json: pagesJsonToSend,
                      fields: fieldsToSend,
                    },
                    operation: {
                      type: 'addTableRow',
                      tableIndex: targetTableIdx,
                      pageIndex: 0,
                      newFieldKeys: newFieldKeys,
                    },
                  },
                  { withCredentials: true }
                );
                if (response?.data?.success) {
                  console.log('[addTableRow] Backend fallback succeeded');
                  setReloadCounter((prev) => prev + 1);
                  setAddingRow(false);
                } else {
                  console.error('[addTableRow] Backend fallback failed:', response?.data);
                  setAddingRow(false);
                }
              } catch (fallbackErr) {
                console.error('[addTableRow] Backend fallback error:', fallbackErr?.message || fallbackErr);
                setAddingRow(false);
              }
            }
          }
        } catch (cloneErr) {
          console.debug('[addTableRow] Row content clone step failed', cloneErr);
        }

        // Persist the updated structure to backend (fire-and-forget)
        persistFromTemplateAfterChange('addTableRow');
        setAddingRow(false);
        return;
      }
    } catch (e) {
      console.debug('[addTableRow] TipTap insertion failed or unavailable, will fallback to backend op', e);
    }
    
    // Call backend to add the row to pages_json
    try {
      console.log('[addTableRow] Calling backend to insert row...');
      // Ensure pages_json is an array
      let pagesJsonToSend = docData?.from_template?.pages_json || docData?.pages_json;
      if (!Array.isArray(pagesJsonToSend)) {
        pagesJsonToSend = pagesJsonToSend ? [pagesJsonToSend] : [];
      }
      
      const fieldsToSend = docData?.from_template?.fields || docData?.metadata?.template_fields || [];
      
      const response = await axios.patch(
        `${window.location.origin.replace(':3000', ':8000')}/api/documents/${id}/from-template`,
        {
          from_template: {
            pages_json: pagesJsonToSend,
            fields: fieldsToSend
          },
          operation: {
            type: 'addTableRow',
            tableIndex: targetTableIdx,
            pageIndex: 0,
            fieldIds: fieldIds // Use field IDs from template
          }
        },
        { withCredentials: true }
      );
      
      if (response?.data?.success) {
        console.log('[addTableRow] Backend row insertion successful, response:', response?.data);
        
        // If backend returned updated document, use it directly to update docData
        if (response?.data?.document) {
          console.log('[addTableRow] Applying updated document directly from response');
          const updatedDoc = response.data.document;
          
          // Normalize the returned document
          const normalized = {
            ...docData,
            _id: updatedDoc._id || docData?._id,
            from_template: updatedDoc.from_template || docData?.from_template,
            pages_json: Array.isArray(updatedDoc.pages_json) 
              ? updatedDoc.pages_json 
              : Array.isArray(updatedDoc.from_template?.pages_json)
              ? updatedDoc.from_template.pages_json
              : docData?.pages_json || [],
            title: updatedDoc.title || docData?.title,
            document: updatedDoc
          };
          
          console.log('[addTableRow] Setting docData with updated content');
          setDocData(normalized);
          
          // Initialize form data for any new fields found in the updated pages_json
          try {
            const base = normalized.pages_json?.[0];
            if (base && typeof base !== "string") {
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
                console.log('[addTableRow] Initializing formData for new fields:', Object.keys(additions));
                setFormData((prev) => ({
                  ...(prev || {}),
                  ...additions,
                }));
              }
            }
          } catch (e) {
            console.debug('[addTableRow] Error initializing new field values', e);
          }
          
          // Also trigger a hard reload to ensure complete sync
          setTimeout(() => {
            console.log('[addTableRow] Triggering full document reload');
            setReloadCounter(prev => prev + 1);
          }, 500);
          setAddingRow(false);
        } else {
          console.log('[addTableRow] No document in response, triggering reload');
          // Reload the document from backend so editor reads the actual structure
          setReloadCounter(prev => prev + 1);
          setAddingRow(false);
        }
      } else {
        console.error('[addTableRow] Backend returned error:', response?.data);
        setAddingRow(false);
      }
    } catch (err) {
      console.error('[addTableRow] Backend call failed:', err?.message || err);
      setAddingRow(false);
    }
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
    // Persist structure and update from_template.fields by removing the keys
    setTimeout(() => {
      const mutateFields = (currentFields) => {
        if (!Array.isArray(currentFields)) return currentFields;
        const hasSections = Array.isArray(currentFields) && currentFields[0] && Array.isArray(currentFields[0].fields);
        if (hasSections) {
          const tInfo = tablesInfoRef.current?.[targetTableIdx];
          const lastRow = tInfo?.rows?.[tInfo.rows.length - 1];
          const lastCells = Array.isArray(lastRow?.cells) ? lastRow.cells : [];
          const groupId = lastCells[0]?.fieldGroupId || null;
          const sections = currentFields.map((section) => {
            if (section && section.id && groupId && String(section.id) === String(groupId)) {
              const existing = Array.isArray(section.fields) ? section.fields : [];
              return { ...section, fields: existing.filter((f) => !keysToRemove.includes(f.id || f.key || f.name)) };
            }
            return section;
          });
          return sections;
        }
        // Flat list fallback
        return currentFields.filter((f) => !keysToRemove.includes(f.id || f.key || f.name));
      };
      persistFromTemplateAfterChange('table rows updated: remove', mutateFields);
    }, 100);
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

    // Previously we filtered template fields by keys present in pages_json.
    // To ensure newly added rows always render after reload, include all fields.

    if (list[0] && Array.isArray(list[0].fields)) {
      let number = 1;
      const panels = [];
      const localFieldsBucket = [];
      for (const section of list) {
        if (!section) continue;
        const sectionFields = Array.isArray(section.fields) ? section.fields : [];
        const mapped = sectionFields
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
            id: section.id || section._id || undefined,
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
          id: 'local-only',
          title: 'Other fields',
          color: 'bg-blue-500',
          fields: localFieldsBucket,
        });
      }
      return panels.length ? panels : null;
    }

    const fields = list
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
        id: tpl.id || tpl._id || undefined,
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
              const idToLabel = {}; // Map field ID to its label
              tplFields.forEach(f => {
                const k = f.key || f.id || f.name || f._id;
                const lbl = f.label || f.title || f.display || f.name || k;
                const fid = f.id; // The field ID as used in pages_json
                if (k) keyToLabel[String(k)] = String(lbl);
                if (fid) idToLabel[String(fid)] = String(lbl);
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
              fieldIdToLabelRef.current = idToLabel; // Store ID→label mapping for row addition
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
  // AUTO-PREVIEW ON RELOAD
  // ---------------------------
  // When a reload is triggered anywhere (setReloadCounter++), immediately:
  // - switch to Preview mode, so the editor view is the first thing user sees
  // - show the full-screen loader right away while fetching/re-initializing
  useEffect(() => {
    if (reloadCounter > 0) {
      console.log('[EditableFields] Reload triggered – switching to preview and showing loader');
      setShowPreview(true);
      setLoadingDoc(true);
    }
  }, [reloadCounter]);

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
            {(() => {
              // Build set of editable field keys 
              const fieldsInPagesJson = new Set();
              try {
                const baseDoc = docData?.pages_json?.[0];
                const walk = (node) => {
                  if (!node) return;
                  if (node.type === 'editableField' && node.attrs?.key) {
                    fieldsInPagesJson.add(String(node.attrs.key));
                  }
                  if (Array.isArray(node.content)) {
                    node.content.forEach(walk);
                  }
                };
                if (baseDoc && typeof baseDoc === 'object') {
                  walk(baseDoc);
                }
              } catch (e) {
                console.debug('Error scanning pages_json for fields', e);
              }

              // Only show tables if they have fields that exist in pages_json
              const tablesToShow = Object.values(tableFieldsMap)
                .reduce((unique, item) => {
                  if (!unique.some(u => u.tableIdx === item.tableIdx)) {
                    unique.push(item);
                  }
                  return unique;
                }, [])
                .filter((item) => {
                  const tableFieldKeys = Object.values(tableFieldsMap)
                    .filter(f => f.tableIdx === item.tableIdx)
                    .map(f => f.fieldKey);
                  // Only include if at least one field exists in pages_json AND in current section
                  const fieldsInSection = currentSectionData.fields?.filter(field => 
                    field._originalKey && 
                    tableFieldKeys.includes(field._originalKey) &&
                    fieldsInPagesJson.has(String(field._originalKey))
                  ) || [];
                  return fieldsInSection.length > 0;
                });

              if (tablesToShow.length === 0) {
                return null;
              }

              return (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4"> Tables in Document</h3>
                {tablesToShow.map((item) => {
                  const tableFieldKeys = Object.values(tableFieldsMap)
                    .filter(f => f.tableIdx === item.tableIdx)
                    .map(f => f.fieldKey);
                      // Existing fields from template/runtime in this section
                      const tableFieldObjectsBase = currentSectionData.fields
                        ?.filter(field => field._originalKey && tableFieldKeys.includes(field._originalKey) && fieldsInPagesJson.has(String(field._originalKey))) || [];

                      // Add synthetic fields for keys present in pages_json but absent from template/runtime fields
                      const existingKeysSet = new Set(tableFieldObjectsBase.map(f => f._originalKey));
                      const k2l = lastSavedRef.current?.__keyToLabel || {};
                      const syntheticFields = tableFieldKeys
                        .filter((key) => !existingKeysSet.has(key) && fieldsInPagesJson.has(String(key)))
                        .map((key) => {
                          const info = tableDiscoveredFields[key] || {};
                          const rawLabel = k2l[key] || info.label || info.placeholder || key;
                          const label = (typeof rawLabel === 'string' && rawLabel.startsWith('fld-'))
                            ? (info.placeholder || rawLabel)
                            : rawLabel;
                          return {
                            type: (info.type === 'text' ? 'input' : info.type) || 'input',
                            name: label,
                            _originalKey: key,
                            label,
                            placeholder: info.placeholder || label,
                            instructions: '',
                            dateFormat: info.dateFormat || null,
                            required: false,
                            options: null,
                            tags: [],
                          };
                        });

                      const tableFieldObjects = [...tableFieldObjectsBase, ...syntheticFields];
                  
                  // Only render this table if it actually exists in the document structure and has fields
                  const tableExists = Array.isArray(tablesInfoRef.current?.[item.tableIdx]?.rows) && 
                                      tablesInfoRef.current[item.tableIdx].rows.length > 0;
                  const hasEditableFields = tableFieldObjects.length > 0;
                  
                  if (!tableExists || !hasEditableFields) {
                    return null;
                  }
                  
                  return (
                    <div key={item.tableIdx} className="border-2 border-blue-300 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-bold text-blue-900">Table {item.tableIdx + 1}</h4>
                        <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-semibold">
                          {tableFieldObjects.length} fields
                        </span>
                      </div>
                      
                      {/* Display fillable fields grouped by table row */}
                      <div className="bg-white rounded-lg border-2 border-blue-200 p-4 mb-3">
                        <div className="flex items-start gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            <strong>Fill fields by row:</strong> Complete fields in each row, then click "Add Row" to create more rows.
                          </p>
                        </div>

                        {/* Show editable fields grouped by their row in the table */}
                        <div className="space-y-4">
                          {Array.isArray(tablesInfoRef.current?.[item.tableIdx]?.rows) && tablesInfoRef.current[item.tableIdx].rows.map((row, rowIdx) => {
                            const cellsInRow = Array.isArray(row.cells) ? row.cells : [];
                            const fieldsInRow = cellsInRow
                              .map(cell => {
                                const fieldObj = tableFieldObjects.find(f => f._originalKey === cell.fieldKey);
                                return { cell, fieldObj };
                              })
                              .filter(item => {
                                // Check if field exists in pages_json by either fieldObj key or cell key
                                if (!item.fieldObj) return false;
                                const fieldKey = item.fieldObj._originalKey || item.cell.fieldKey;
                                return fieldsInPagesJson.has(String(fieldKey));
                              });
                            
                            if (fieldsInRow.length === 0) return null;

                            return (
                              <div key={rowIdx} className="bg-gray-50 border border-blue-300 rounded-lg p-4">
                                <div className="mb-3 pb-3 border-b border-blue-200">
                                  <span className="text-sm font-bold text-blue-900">Row {rowIdx + 1}</span>
                                  <span className="text-xs text-gray-600 ml-2">({fieldsInRow.length} field{fieldsInRow.length > 1 ? 's' : ''})</span>
                                </div>
                                <div className="space-y-3">
                                  {fieldsInRow.map(({ cell, fieldObj }, fieldIdx) => {
                                    let displayName = fieldObj.name;
                                    if (typeof displayName === 'string' && displayName.startsWith('fld-')) {
                                      const fallback = fieldObj.label && !fieldObj.label.startsWith('fld-') ? fieldObj.label : (fieldObj.placeholder || fieldObj.name);
                                      displayName = fallback;
                                    }
                                    const value = formData[displayName] || "";
                                    return (
                                      <div key={fieldIdx} className="bg-white border border-gray-300 rounded p-3">
                                        <label className="text-sm font-semibold text-gray-800 mb-2 block">
                                          {displayName}
                                          {fieldObj.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        
                                        {fieldObj.instructions && (
                                          <p className="text-xs text-blue-700 mb-2 bg-blue-50 p-2 rounded border border-blue-200">{fieldObj.instructions}</p>
                                        )}
                                        
                                        <div>
                                          {(fieldObj.type === 'input' || fieldObj.type === 'text') ? (
                                            <input
                                              type="text"
                                              value={value}
                                              onChange={(e) => handleInputChange(displayName, e.target.value)}
                                              placeholder={fieldObj.placeholder || 'Your answer'}
                                              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors text-gray-900 placeholder-gray-400 bg-white"
                                            />
                                          ) : fieldObj.type === 'textarea' ? (
                                            <textarea
                                              value={value}
                                              onChange={(e) => handleInputChange(displayName, e.target.value)}
                                              placeholder={fieldObj.placeholder || 'Your answer'}
                                              rows={3}
                                              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-colors resize-y text-gray-900 placeholder-gray-400 bg-white"
                                            />
                                          ) : fieldObj.type === 'date' ? (
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
                            );
                          })}
                        </div>
                      </div>

                      {/* Hidden: original flat field list - keeping for reference but not displayed */}
                      <div className="hidden">
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
            );
            })()}

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

      {/* Add Row Loading Overlay */}
      <AddRowOverlay show={addingRow} message="Adding row…" />
    </div>
  </div>
  );
}