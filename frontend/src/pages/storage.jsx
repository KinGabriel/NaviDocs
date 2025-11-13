// src/pages/storage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { getFoldersAPI, getFolderByIDAPI, createFolderAPI, addDocumentsAPI, addOrphanFileAPI, getOrphanFilesAPI, moveFolderAPI, moveFileAPI, renameFolderAPI, renameFileAPI, deleteFolderByIDAPI, deleteFileAPI, deleteFileFromFolderAPI, addAccessToFoldersAPI, addAccessToFileAPI, } from "../api/storageAPI";
import { searchUsersByEmailAPI, getUserIdByEmailAPI } from "../api/userAPI";
import { SCHOOL_OPTIONS, DEPARTMENT_OPTIONS } from "../utils/options";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import FolderComponent from "../components/folder";
import FileComponent from "../components/file";
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import Dropdown3 from "../components/dropdowns/dropdown3";
import MultiSelectDropdown from "../components/dropdowns/multiSelectDropdown";
import MoveModal from "../components/modals/moveModal";
import RenameFolderModal from "../components/modals/renameFolderModal";
import RenameModal from "../components/modals/renameModal";
import RemoveModal from "../components/modals/removeModal";
import Loader from "../components/loader";
import toast, { Toaster } from "react-hot-toast";
import { Plus, ArrowLeft, FolderPlus, Upload, FolderUp, X, ChevronRight, Folder, File, MoreVertical, Download, Pencil, FolderCog, Move, Share2, Copy, Trash2, Minimize2, Maximize2 } from "lucide-react";
import { formatDate } from "../utils/formatters";

/* ----------------------------- View Toggle ----------------------------- */
function ViewToggle({ mode = "table", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden shrink-0">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center ${isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
        aria-label="List view"
        title="List view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center ${!isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
        aria-label="Grid view"
        title="Grid view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="6" height="6" rx="1"></rect>
          <rect x="14" y="4" width="6" height="6" rx="1"></rect>
          <rect x="4" y="14" width="6" height="6" rx="1"></rect>
          <rect x="14" y="14" width="6" height="6" rx="1"></rect>
        </svg>
      </button>
    </div>
  );
}


function KebabMenuPortal({ anchorEl, open, onClose, children, width = 224 }) {
  const menuRef = React.useRef(null);
  const [pos, setPos] = React.useState({ left: 0, top: 0 });

  React.useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const gap = 8;
    const menuH = menuRef.current?.offsetHeight ?? 280;
    const menuW = width;
    const left = Math.min(window.innerWidth - gap - menuW, rect.right - menuW);
    let top = rect.bottom + gap;
    if (top + menuH > window.innerHeight - gap) {
      top = Math.max(gap, rect.top - gap - menuH);
    }
    setPos({ left, top });
  }, [open, anchorEl, width]);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && e.target !== anchorEl) onClose?.();
    };
    const onEsc = (e) => { if (e.key === "Escape") onClose?.(); };
    const onScroll = () => onClose?.();
    const onResize = () => onClose?.();

    document.addEventListener("mousedown", onDocClick, true);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick, true);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl) return null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: "fixed", left: pos.left, top: pos.top, width }}
      className="z-[1000] rounded-lg border border-gray-200 bg-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
  return createPortal(menu, document.body);
}


/* ================================ Page ================================ */
export default function Storage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser();

  /* ---------- view & filters ---------- */
  const [viewMode, setViewMode] = useState("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortRecent, setSortRecent] = useState("Sort by");
  const statusOptions = ["Owned by anyone", "Owned by me", "Not owned by me"];
  const [selectedStatus, setSelectedStatus] = useState("Owned by anyone");

  /* ---------- folders/files ---------- */
  const [folders, setFolders] = useState([]);
  const [rootFiles, setRootFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);

  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingRootFiles, setLoadingRootFiles] = useState(false);
  const [loadingFolderDetails, setLoadingFolderDetails] = useState(false);

  /* ---------- menus & modals (table view) ---------- */
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [openFileMenu, setOpenFileMenu] = useState(null);
  const [openOrganizeSubmenu, setOpenOrganizeSubmenu] = useState(null);
  const [openShareSubmenu, setOpenShareSubmenu] = useState(null);

  // Global portal menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuKind, setMenuKind] = useState(null); // "folder" | "file"
  const [menuId, setMenuId] = useState(null);
  const anchorEls = useRef({});

  /* rename/remove (table) */
  const [itemToRename, setItemToRename] = useState(null);
  const [renameType, setRenameType] = useState("folder");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [removeType, setRemoveType] = useState("folder");
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  /* move (shared) */
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const [moveType, setMoveType] = useState("folder");

  /* new folder */
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [createFolderError, setCreateFolderError] = useState(null);

  /* uploads */
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadingOrphan, setUploadingOrphan] = useState(false);
  const [uploadOrphanError, setUploadOrphanError] = useState(null);

  /* breadcrumb */
  const [folderPath, setFolderPath] = useState([]);

  /* pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;


  // === List View Preview State ===
  const [lvPreviewOpen, setLvPreviewOpen] = useState(false);
  const [lvPreviewExpanded, setLvPreviewExpanded] = useState(false);
  const [lvPreviewFile, setLvPreviewFile] = useState(null);

  const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const API_URLS = rawUrls.split(",");
  const API_URL = API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

  // --- MATCH grid view URL construction (same behavior as file.jsx) ---
  const getFileUrl = (file) => {
    if (!file || typeof file === "string") return null;

    // 1) Explicit filePath (already relative like "uploads/...") -> join to API origin
    if (file.filePath) {
      return `${API_URL.replace(/\/$/, "")}/${String(file.filePath).replace(/^\//, "")}`;
    }

    // 2) Raw absolute/relative path possibly from backend (may be windows path)
    if (file.path) {
      let relPath = String(file.path).replace(/\\/g, "/");
      const idx = relPath.indexOf("/uploads/");
      if (idx !== -1) relPath = relPath.slice(idx + 1); // drop leading slash before uploads
      return `${API_URL.replace(/\/$/, "")}/${relPath}`;
    }

    // 3) Direct URL already prepared
    if (file.url) return file.url;

    // 4) Fallback to uploads/{storageName|_id}
    return `${API_URL.replace(/\/$/, "")}/uploads/${file.storageName || file._id}`;
  };

  const isPdf = (f) =>
    (f?.mimetype || "").toLowerCase().includes("pdf") ||
    (f?.name || f?.fileName || f?.originalName || "").toLowerCase().endsWith(".pdf");

  const isDocx = (f) =>
    (f?.mimetype || "").toLowerCase().includes("word") ||
    (f?.name || f?.fileName || f?.originalName || "").toLowerCase().endsWith(".docx");

  const openListPreview = (file) => {
    const url = getFileUrl(file);
    setLvPreviewFile({
      ...file,
      fileUrl: url,
      fileName: file?.name || file?.originalName || file?.fileName || "Untitled",
    });
    setLvPreviewExpanded(false);
    setLvPreviewOpen(true);
  };


  /* ---------- SHARE (table view) — folders & files, same as grid ---------- */
  // common helpers
  const debounce = (fn, delay) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  /* Folder share modal */
  const [showFolderShare, setShowFolderShare] = useState(false);
  const [shareFolder, setShareFolder] = useState(null);
  const [folderVisibility, setFolderVisibility] = useState("private");
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const availableDepartments = selectedSchools
    .flatMap((school) => DEPARTMENT_OPTIONS[school] || [])
    .map((d) => ({ value: d, label: d }));

  const [folderEmails, setFolderEmails] = useState([]); // {email, role, isOwner, userId}
  const [folderInputEmail, setFolderInputEmail] = useState("");
  const [folderInputRole, setFolderInputRole] = useState("Viewer");
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const fetchEmailSuggestions = async (query) => {
    if (!query || query.length < 2) return setEmailSuggestions([]);
    try {
      const users = await searchUsersByEmailAPI(query);
      setEmailSuggestions(users);
    } catch {
      setEmailSuggestions([]);
    }
  };
  const suggestDebounced = useRef(debounce(fetchEmailSuggestions, 400));

  /* File share modal */
  const [showFileShare, setShowFileShare] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [fileVisibility, setFileVisibility] = useState("private");
  const [fileEmails, setFileEmails] = useState([]);
  const [fileInputEmail, setFileInputEmail] = useState("");
  const [fileInputRole, setFileInputRole] = useState("Viewer");

  /* ================================= Effects ================================= */

  useEffect(() => {
    if (showNewFolderModal) setParentFolderId(selectedFolder?._id || "");
  }, [showNewFolderModal, selectedFolder]);

  useEffect(() => {
    // Trigger content load even if `user` is not yet populated so the page shell appears
    // and the app can progressively hydrate when auth arrives. Backend will fallback to
    // authenticated user from cookies when applicable.
    loadContent();
    // eslint-disable-next-line
  }, [id, user, selectedStatus]);

  const loadContent = async () => {
    setLoadingFolders(true);
    setLoadingRootFiles(true);
    setLoadingFolderDetails(true);
    try {
      if (!id) await loadRootContent();
      else await loadFolderById(id);
    } catch (err) {
      console.error(err);
      navigate("/storage");
    }
  };

  const loadRootContent = async () => {
    try {
      const foldersData = await getFoldersAPI({ user, status: selectedStatus });
      const mapped = (foldersData.folders || []).map((f) => ({
        name: f.folderName || "Unnamed Folder",
        date: f.createdAt || "",
        _id: f._id,
        data: { ...f, parentFolder: f.parentFolder ? String(f.parentFolder) : null },
      }));
      setFolders(mapped);
      const orphanFiles = await getOrphanFilesAPI(user._id, selectedStatus);
      setRootFiles(orphanFiles.files || []);
      setSelectedFolder(null);
      setFolderPath([]);
    } finally {
      setLoadingFolders(false);
      setLoadingRootFiles(false);
      setLoadingFolderDetails(false);
    }
  };

  const loadFolderById = async (folderId) => {
    try {
      const allFoldersData = await getFoldersAPI({ user, status: selectedStatus });
      const mapped = (allFoldersData.folders || []).map((f) => ({
        name: f.folderName || "Unnamed Folder",
        date: f.createdAt || "",
        _id: f._id,
        data: { ...f, parentFolder: f.parentFolder ? String(f.parentFolder) : null },
      }));
      setFolders(mapped);

      const folderData = await getFolderByIDAPI(folderId, user._id, selectedStatus);
      setSelectedFolder(folderData.folder);
    } finally {
      setLoadingFolders(false);
      setLoadingRootFiles(false);
      setLoadingFolderDetails(false);
    }
  };

  const openFolder = (folderId) => navigate(`/storage/folders/${folderId}`);
  const navigateToFolder = (folderId) =>
    folderId ? navigate(`/storage/folders/${folderId}`) : navigate("/storage");
  const goBack = () =>
    selectedFolder?.parentFolder
      ? navigate(`/storage/folders/${selectedFolder.parentFolder}`)
      : navigate("/storage");

  // breadcrumb
  useEffect(() => {
    if (!selectedFolder?._id || folders.length === 0) {
      setFolderPath([]);
      return;
    }
    const buildPath = (folderId) => {
      const path = [];
      let currentId = folderId;
      const visited = new Set();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const f = folders.find((x) => x._id === currentId);
        if (!f) break;
        path.unshift({ id: f._id, name: f.name, data: f.data });
        currentId = f.data?.parentFolder;
      }
      return path;
    };
    setFolderPath(buildPath(selectedFolder._id));
  }, [selectedFolder, folders]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenFolderMenu(null);
      setOpenFileMenu(null);
      setOpenOrganizeSubmenu(null);
      setOpenShareSubmenu(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  /* ================================= Helpers ================================= */

  const openMenu = (kind, id) => { setMenuKind(kind); setMenuId(id); setMenuOpen(true); };
  const closeMenu = () => { setMenuOpen(false); setMenuId(null); setMenuKind(null); };
  const currentAnchor = anchorEls.current[menuKind ? `${menuKind}-${menuId}` : ""];


  const toggleFolderMenu = (id, e) => {
    if (e) e.stopPropagation();
    setOpenFolderMenu(openFolderMenu === id ? null : id);
  };
  const toggleFileMenu = (id, e) => {
    if (e) e.stopPropagation();
    setOpenFileMenu(openFileMenu === id ? null : id);
  };

  const displayedFolders = useMemo(() => {
    let rows = [...folders];
    rows = selectedFolder?._id
      ? rows.filter((f) => f.data.parentFolder === selectedFolder._id)
      : rows.filter((f) => !f.data.parentFolder);
    if (sortRecent === "Recent") rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => f.name.toLowerCase().includes(q));
    }
    return rows;
  }, [searchQuery, sortRecent, folders, selectedFolder]);

  const displayedFiles = useMemo(() => {
    let rows = selectedFolder ? selectedFolder.dbfiles || [] : rootFiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => (f.name || f.originalName || f.fileName || "").toLowerCase().includes(q));
    }
    return rows;
  }, [selectedFolder, searchQuery, rootFiles]);

  const totalFolderPages = Math.ceil(displayedFolders.length / itemsPerPage);
  const totalFilePages = Math.ceil(displayedFiles.length / itemsPerPage);
  const totalPages = Math.max(totalFolderPages, totalFilePages, 1);

  useEffect(() => setCurrentPage(1), [searchQuery, sortRecent, selectedStatus, id]);

  const paginatedFolders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedFolders.slice(start, start + itemsPerPage);
  }, [displayedFolders, currentPage]);

  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedFiles.slice(start, start + itemsPerPage);
  }, [displayedFiles, currentPage]);

  const pagination = {
    currentPage,
    totalPages,
    handlePrev: () => setCurrentPage((p) => Math.max(1, p - 1)),
    handleNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
    handlePage: (n) => setCurrentPage(n),
    getPageNumbers: () => {
      const pages = [];
      const maxVisible = 5;
      if (totalPages <= maxVisible) for (let i = 1; i <= totalPages; i++) pages.push(i);
      else if (currentPage <= 3) pages.push(1, 2, 3, 4, "...", totalPages);
      else if (currentPage >= totalPages - 2)
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      return pages;
    },
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setCreateFolderError(null);
    try {
      await createFolderAPI({
        folderName: newFolderName.trim(),
        user,
        parentFolder: parentFolderId || null,
      });
      await loadContent();
      setNewFolderName("");
      setParentFolderId("");
      setShowNewFolderModal(false);
    } catch (err) {
      setCreateFolderError(err.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  /* -------------------------- Move handlers -------------------------- */
  const handleMoveFolder = (folder) => {
    setItemToMove(folder);
    setMoveType("folder");
    setShowMoveModal(true);
  };
  const handleMoveFile = (file) => {
    setItemToMove(file);
    setMoveType("file");
    setShowMoveModal(true);
  };
  const handleMove = async (destinationId) => {
    if (!itemToMove) return;
    try {
      if (moveType === "folder") await moveFolderAPI(itemToMove._id, destinationId);
      else
        await moveFileAPI(
          itemToMove._id,
          destinationId,
          selectedFolder ? selectedFolder._id : null
        );
      await loadContent();
    } catch (err) {
      toast.error(err.message || "Failed to move item");
    } finally {
      setShowMoveModal(false);
      setItemToMove(null);
    }
  };

  const isInitialLoading =
    (loadingFolders || loadingFolderDetails) && folders.length === 0 && !selectedFolder;
  const needsPagination =
    displayedFolders.length > itemsPerPage || displayedFiles.length > itemsPerPage;

  /* ========================== Table: Share actions ========================== */
  const buildFolderEmailsFromData = (f) => {
    const emails = [];
    const ownerEmail = f?.data?.ownerEmail || f?.data?.owner || user?.email;
    if (ownerEmail) emails.push({ email: ownerEmail, role: "Owner", isOwner: true });
    (f?.data?.allowedUsers || []).forEach((u) => {
      if (u.email && u.role) emails.push({ email: u.email, role: u.role, userId: u.userId });
      else if (u.userId && u.role) emails.push({ email: u.userId, role: u.role, userId: u.userId });
    });
    return emails;
  };

  const buildFileEmailsFromData = (file) => {
    const emails = [];
    const ownerEmail = file?.ownerEmail || file?.owner || user?.email;
    if (ownerEmail) emails.push({ email: ownerEmail, role: "Owner", isOwner: true });
    (file?.allowedUsers || []).forEach((u) => {
      if (u.email && u.role) emails.push({ email: u.email, role: u.role, userId: u.userId });
      else if (u.userId && u.role) emails.push({ email: u.userId, role: u.role, userId: u.userId });
    });
    return emails;
  };

  const handleFolderShareOpen = (folder) => {
    setShareFolder(folder);
    setFolderVisibility(folder?.data?.visibility || "private");
    setSelectedSchools(folder?.data?.allowedSchools || []);
    setSelectedDepartments(folder?.data?.allowedDepartments || []);
    setFolderEmails(buildFolderEmailsFromData(folder));
    setShowFolderShare(true);
  };

  const handleFileShareOpen = (file) => {
    setShareFile(file);
    setFileVisibility(file?.visibility || "private");
    setFileEmails(buildFileEmailsFromData(file));
    setShowFileShare(true);
  };

  const addEmailToFolder = async () => {
    const email = folderInputEmail.trim();
    if (!email) return;
    const isValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!isValid) return toast.error("Please enter a valid email.");
    if (folderEmails.some((e) => e.email === email)) return;
    try {
      const userId = await getUserIdByEmailAPI(email);
      if (!userId) return toast.error("No user found with this email.");
      setFolderEmails([...folderEmails, { email, userId, role: folderInputRole }]);
      setFolderInputEmail("");
      setFolderInputRole("Viewer");
    } catch {
      toast.error("Error checking user existence.");
    }
  };

  const addEmailToFile = async () => {
    const email = fileInputEmail.trim();
    if (!email) return;
    const isValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (!isValid) return toast.error("Please enter a valid email.");
    if (fileEmails.some((e) => e.email === email)) return;
    try {
      const userId = await getUserIdByEmailAPI(email);
      if (!userId) return toast.error("No user found with this email.");
      setFileEmails([...fileEmails, { email, userId, role: fileInputRole }]);
      setFileInputEmail("");
      setFileInputRole("Viewer");
    } catch {
      toast.error("Error checking user existence.");
    }
  };

  const copyFolderLink = (f) => {
    navigator.clipboard.writeText(`https://mydrive.com/folder/${f.name.replace(/\s+/g, "-")}`);
    toast.success("Link copied to clipboard!");
  };
  const copyFileLink = (file) => {
    const name = file?.originalName || file?.name || file?.fileName || "file";
    navigator.clipboard.writeText(`https://mydrive.com/file/${name.replace(/\s+/g, "-")}`);
    toast.success("Link copied to clipboard!");
  };

  /* ================================== UI ================================== */
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <Toaster position="top-center" />
      {/* Make the main area stack on small screens, side-by-side from md+ */}
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar user={user} active="Filled-Out Documents Storage" />

        {/* Move modal */}
        <MoveModal
          folders={folders}
          open={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMove}
          itemToMove={itemToMove}
          type={moveType}
        />

        {/* Rename (table) */}
        {showRenameModal && renameType === "folder" && (
          <RenameFolderModal
            open={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            currentTitle={itemToRename?.name}
            onSubmit={async (newTitle) => {
              await renameFolderAPI(itemToRename._id, newTitle);
              setShowRenameModal(false);
              setItemToRename(null);
              await loadContent();
            }}
          />
        )}
        {showRenameModal && renameType === "file" && (
          <RenameModal
            open={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            currentTitle={itemToRename?.name || itemToRename?.originalName}
            onSubmit={async (newTitle) => {
              await renameFileAPI(itemToRename._id, newTitle, selectedFolder?._id);
              setShowRenameModal(false);
              setItemToRename(null);
              await loadContent();
            }}
          />
        )}

        {/* Remove (table) */}
        {showRemoveModal && (
          <RemoveModal
            open={showRemoveModal}
            onClose={() => setShowRemoveModal(false)}
            itemType={removeType}
            itemTitle={
              removeType === "folder"
                ? itemToRemove?.name || "Folder"
                : itemToRemove?.name || itemToRemove?.originalName || "File"
            }
            onConfirm={async () => {
              if (removeType === "folder") {
                await deleteFolderByIDAPI(itemToRemove._id);
              } else {
                if (selectedFolder?._id)
                  await deleteFileFromFolderAPI(selectedFolder._id, itemToRemove._id);
                else await deleteFileAPI(itemToRemove._id);
              }
              setShowRemoveModal(false);
              setItemToRemove(null);
              await loadContent();
            }}
          />
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 sm:px-6 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl">
          {!selectedFolder && (
            <>
              <h1 className="text-2xl md:text-3xl font-semibold mt-6 md:mt-8 tracking-wide">DOCUMENT STORAGE</h1>
              <div className="w-24 md:w-30 h-1 bg-yellow-400 mb-4 md:mb-6 rounded" />
            </>
          )}

          {/* Breadcrumb */}
          {selectedFolder && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 pb-3 md:pb-4 border-b border-gray-100 gap-3">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 mt-4 rounded-lg text-[#0035DA] hover:bg-blue-50 transition-all duration-200 font-medium"
              >
                <ArrowLeft size={18} /> Back
              </button>
              <div className="flex items-center text-sm font-medium overflow-hidden">
                <button
                  onClick={() => navigateToFolder(null)}
                  className="text-gray-600 hover:text-[#0035DA] hover:underline transition-colors flex-shrink-0"
                >
                  Storage
                </button>
                {folderPath.length > 3 ? (
                  <>
                    <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                    <span className="text-gray-400 flex-shrink-0">...</span>
                    <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                    {folderPath.slice(-2).map((folder, index) => (
                      <React.Fragment key={folder.id}>
                        {index > 0 && <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />}
                        <button
                          onClick={() => navigateToFolder(folder.id)}
                          className={`truncate max-w-[120px] text-ellipsis overflow-hidden transition-colors ${index === 1
                              ? "text-[#0035DA] font-semibold cursor-default"
                              : "text-gray-600 hover:text-[#0035DA] hover:underline"
                            }`}
                          disabled={index === 1}
                          title={folder.name}
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  folderPath.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                      <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                      <button
                        onClick={() => navigateToFolder(folder.id)}
                        className={`truncate max-w-[120px] text-ellipsis overflow-hidden transition-colors ${index === folderPath.length - 1
                            ? "text-[#0035DA] font-semibold cursor-default"
                            : "text-gray-600 hover:text-[#0035DA] hover:underline"
                          }`}
                        disabled={index === folderPath.length - 1}
                        title={folder.name}
                      >
                        {folder.name}
                      </button>
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6 mb-3 bg-gray-50/50 p-3 rounded-lg">
            {/* Left chunk */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* New */}
              <div className="relative">
                <button
                  onClick={() => setShowNewMenu((prev) => !prev)}
                  className="bg-blue-700 text-white px-4 sm:px-5 py-2 rounded font-semibold text-sm flex items-center gap-2 hover:bg-blue-800 focus:outline-none focus:ring-0"
                >
                  <Plus className="w-5 h-5" /> New
                </button>
                {showNewMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-[#0035DA] rounded-lg transition-all duration-150 font-medium"
                      onClick={() => {
                        setShowNewFolderModal(true);
                        setShowNewMenu(false);
                      }}
                    >
                      <FolderPlus size={20} className="text-blue-500" /> New Folder
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-all duration-150 font-medium"
                      onClick={() => {
                        setShowNewMenu(false);
                        (selectedFolder
                          ? document.getElementById("upload-documents-global")
                          : document.getElementById("upload-orphan-files")
                        ).click();
                      }}
                    >
                      <Upload size={20} className="text-green-500" /> Upload File
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-all duration-150 font-medium">
                      <FolderUp size={20} className="text-purple-500" /> Upload Folder
                    </button>
                  </div>
                )}
              </div>

              {/* Status filter */}
              <div className="flex gap-1 flex-wrap">
                {statusOptions.map((status) => {
                  const isSelected = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 border ${isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                        }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right chunk */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <Dropdown
                options={["Last Modified", "Date Created", "Title"]}
                value={sortRecent}
                onChange={setSortRecent}
                width="w-full sm:w-36"
                label="Sort"
                buttonClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm px-3 py-2.5 shadow-sm w-full sm:w-auto"
              />
              <div className="w-full sm:w-64 md:w-72">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search files and folders..."
                />
              </div>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <div className="border-t border-gray-200 mb-4"></div>

          {isInitialLoading ? (
            <Loader message="Loading storage..." />
          ) : (
            <>
              {/* ------------------------------ FOLDERS ------------------------------ */}
              <h3 className="text-base md:text-lg font-semibold mb-3">Folders</h3>
              {loadingFolders ? (
                <Loader message="Loading folders..." />
              ) : paginatedFolders.length ? (
                viewMode === "table" ? (
                  <div className="overflow-x-auto mb-8 border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Last Modified
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedFolders.map((folder) => (
                          <tr
                            key={folder._id}
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => openFolder(folder._id)}
                          >
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900">{folder.name}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                              {folder.data?.owner?.name
                                || (folder.data?.ownerEmail
                                  ? folder.data.ownerEmail.split("@")[0]
                                  : (typeof folder.data?.owner === "string"
                                    ? folder.data.owner.split("@")[0]
                                    : "Unknown"))}
                            </td>
                            <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                              {formatDate(folder.date)}
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="relative">
                                <button
                                  ref={(el) => { if (el) anchorEls.current[`folder-${folder._id}`] = el; else delete anchorEls.current[`folder-${folder._id}`]; }} onClick={(e) => { e.stopPropagation(); openMenu("folder", folder._id); }}
                                  className="p-1 rounded-full hover:bg-gray-300"
                                >
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>

                                {openFolderMenu === `folder-${folder._id}` && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                                    <ul className="text-sm text-gray-700">
                                      <li
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toast("Download clicked");
                                          setOpenFolderMenu(null);
                                        }}
                                      >
                                        <Download size={16} className="text-gray-600" /> Download
                                      </li>

                                      <li
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setItemToRename(folder);
                                          setRenameType("folder");
                                          setShowRenameModal(true);
                                          setOpenFolderMenu(null);
                                        }}
                                      >
                                        <Pencil size={16} className="text-gray-600" /> Rename
                                      </li>

                                      <hr className="my-1" />

                                      {/* Organize submenu */}
                                      <li
                                        className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setOpenOrganizeSubmenu(`folder-${folder._id}`);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setOpenOrganizeSubmenu(null);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <FolderCog size={16} className="text-gray-600" /> Organize
                                        </div>
                                        <span className="text-gray-500 text-xs">▶</span>

                                        {openOrganizeSubmenu === `folder-${folder._id}` && (
                                          <ul
                                            className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50"
                                            onMouseEnter={(e) => {
                                              e.stopPropagation();
                                              setOpenOrganizeSubmenu(`folder-${folder._id}`);
                                            }}
                                            onMouseLeave={(e) => {
                                              e.stopPropagation();
                                              setOpenOrganizeSubmenu(null);
                                            }}
                                          >
                                            <li
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveFolder(folder);
                                                setOpenFolderMenu(null);
                                                setOpenOrganizeSubmenu(null);
                                              }}
                                            >
                                              <Move size={16} className="text-gray-600" /> Move
                                            </li>
                                          </ul>
                                        )}
                                      </li>

                                      {/* Share submenu */}
                                      <li
                                        className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                        onMouseEnter={(e) => {
                                          e.stopPropagation();
                                          setOpenShareSubmenu(`folder-${folder._id}`);
                                        }}
                                        onMouseLeave={(e) => {
                                          e.stopPropagation();
                                          setOpenShareSubmenu(null);
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Share2 size={16} className="text-gray-600" /> Share
                                        </div>
                                        <span className="text-gray-500 text-xs">▶</span>

                                        {openShareSubmenu === `folder-${folder._id}` && (
                                          <ul
                                            className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50"
                                            onMouseEnter={(e) => {
                                              e.stopPropagation();
                                              setOpenShareSubmenu(`folder-${folder._id}`);
                                            }}
                                            onMouseLeave={(e) => {
                                              e.stopPropagation();
                                              setOpenShareSubmenu(null);
                                            }}
                                          >
                                            <li
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleFolderShareOpen(folder);
                                                setOpenFolderMenu(null);
                                                setOpenShareSubmenu(null);
                                              }}
                                            >
                                              <Share2 size={16} className="text-gray-600" /> Share
                                            </li>
                                            <li
                                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyFolderLink(folder);
                                                setOpenFolderMenu(null);
                                                setOpenShareSubmenu(null);
                                              }}
                                            >
                                              <Copy size={16} className="text-gray-600" /> Get Link
                                            </li>
                                          </ul>
                                        )}
                                      </li>

                                      <hr className="my-1" />

                                      <li
                                        className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setItemToRemove(folder);
                                          setRemoveType("folder");
                                          setShowRemoveModal(true);
                                          setOpenFolderMenu(null);
                                        }}
                                      >
                                        <Trash2 size={16} className="text-red-600" /> Archive
                                      </li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // grid cards
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {paginatedFolders.map((folder, idx) => (
                      <FolderComponent
                        key={folder._id}
                        folder={folder}
                        index={idx}
                        isMenuOpen={openFolderMenu === idx}
                        toggleMenu={toggleFolderMenu}
                        onClick={() => openFolder(folder._id)}
                        onMoveRequest={handleMoveFolder}
                        onDelete={async () => {
                          await loadContent();
                        }}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )
              ) : (
                !loadingFolders &&
                displayedFolders.length === 0 && (
                  <p className="text-gray-500 italic mb-8">No folders found.</p>
                )
              )}

              {/* Hidden uploaders */}
              <input
                id="upload-orphan-files"
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  setUploadOrphanError(null);
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setUploadingOrphan(true);
                  try {
                    await addOrphanFileAPI(files, user._id, user?.role?.school);
                    await loadContent();
                    e.target.value = "";
                  } catch (err) {
                    setUploadOrphanError(err.message || "Failed to upload files");
                  } finally {
                    setUploadingOrphan(false);
                  }
                }}
                disabled={uploadingOrphan}
              />

              <input
                id="upload-documents-global"
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  setUploadError(null);
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  setUploading(true);
                  try {
                    await addDocumentsAPI(
                      selectedFolder._id,
                      files,
                      user._id,
                      selectedFolder.owner
                    );
                    await loadContent();
                    e.target.value = "";
                  } catch (err) {
                    setUploadError(err.message || "Failed to upload files");
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading}
              />

              {uploadingOrphan && <span className="text-blue-600 text-sm">Uploading...</span>}
              {uploadOrphanError && <span className="text-red-600 text-sm">{uploadOrphanError}</span>}
              {uploading && <span className="text-blue-600 text-sm">Uploading...</span>}
              {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}

              {/* ------------------------------- FILES ------------------------------- */}
              <h3 className="text-base md:text-lg font-semibold mb-3">
                {selectedFolder ? `Files in ${selectedFolder.folderName}` : "Files"}
              </h3>

              {(loadingRootFiles || loadingFolderDetails) ? (
                <Loader message="Loading files..." />
              ) : paginatedFiles.length ? (
                viewMode === "table" ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Last Modified
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="text-left px-4 md:px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedFiles.map((file, idx) => {
                          const fileName =
                            file.name || file.originalName || file.fileName || "Untitled";
                          const fileSize = file.size
                            ? `${(file.size / 1024).toFixed(2)} KB`
                            : "-";
                          const fileKey = file._id || idx;

                          return (
                            <tr key={fileKey} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={(e) => {
                              if (e.target.closest(".file-menu-area") || e.target.closest(".file-menu-action")) return;
                              openListPreview(file);
                            }}
                            >
                              <td className="px-4 md:px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">{fileName}</span>
                                </div>
                              </td>

                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                                {file.owner?.name
                                  || (file.ownerEmail
                                    ? file.ownerEmail.split("@")[0]
                                    : (typeof file.owner === "string" ? file.owner.split("@")[0] : "Unknown"))}
                              </td>

                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600">
                                {formatDate(file.uploadedAt || file.createdAt)}
                              </td>

                              <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{fileSize}</td>

                              <td className="px-4 md:px-6 py-4">
                                <div className="relative file-menu-area">
                                  <button
                                    ref={(el) => { if (el) anchorEls.current[`file-${fileKey}`] = el; else delete anchorEls.current[`file-${fileKey}`]; }}
                                    onClick={(e) => { e.stopPropagation(); openMenu("file", fileKey); }}
                                    className="p-1 rounded-full hover:bg-gray-300"
                                  >

                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                  </button>

                                  {openFileMenu === `file-${fileKey}` && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                                      <ul className="text-sm text-gray-700">
                                        <li
                                          className="file-menu-action flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toast("Download clicked");
                                            setOpenFileMenu(null);
                                          }}
                                        >
                                          <Download size={16} className="text-gray-600" /> Download
                                        </li>

                                        <li
                                          className="file-menu-action flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setItemToRename(file);
                                            setRenameType("file");
                                            setShowRenameModal(true);
                                            setOpenFileMenu(null);
                                          }}
                                        >
                                          <Pencil size={16} className="text-gray-600" /> Rename
                                        </li>

                                        <hr className="my-1" />

                                        <li
                                          className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            setOpenOrganizeSubmenu(`file-${fileKey}`);
                                          }}
                                          onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            setOpenOrganizeSubmenu(null);
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <FolderCog size={16} className="text-gray-600" /> Organize
                                          </div>
                                          <span className="text-gray-500 text-xs">▶</span>
                                          {openOrganizeSubmenu === `file-${fileKey}` && (
                                            <ul className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50">
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoveFile(file);
                                                  setOpenFileMenu(null);
                                                  setOpenOrganizeSubmenu(null);
                                                }}
                                              >
                                                <Move size={16} className="text-gray-600" /> Move
                                              </li>
                                            </ul>
                                          )}
                                        </li>

                                        <li
                                          className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            setOpenShareSubmenu(`file-${fileKey}`);
                                          }}
                                          onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            setOpenShareSubmenu(null);
                                          }}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Share2 size={16} className="text-gray-600" /> Share
                                          </div>
                                          <span className="text-gray-500 text-xs">▶</span>
                                          {openShareSubmenu === `file-${fileKey}` && (
                                            <ul className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50">
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleFileShareOpen(file);
                                                  setOpenFileMenu(null);
                                                  setOpenShareSubmenu(null);
                                                }}
                                              >
                                                <Share2 size={16} className="text-gray-600" /> Share
                                              </li>
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  copyFileLink(file);
                                                  setOpenFileMenu(null);
                                                  setOpenShareSubmenu(null);
                                                }}
                                              >
                                                <Copy size={16} className="text-gray-600" /> Get Link
                                              </li>
                                            </ul>
                                          )}
                                        </li>

                                        <hr className="my-1" />

                                        <li
                                          className="file-menu-action flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setItemToRemove(file);
                                            setRemoveType("file");
                                            setShowRemoveModal(true);
                                            setOpenFileMenu(null);
                                          }}
                                        >
                                          <Trash2 size={16} className="text-red-600" /> Archive
                                        </li>
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>

                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // grid thumbs
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {paginatedFiles.map((file, idx) => (
                      <FileComponent
                        key={file._id || file.name || idx}
                        file={file}
                        index={idx}
                        isMenuOpen={openFileMenu === `file-${idx}`}
                        toggleMenu={toggleFileMenu}
                        onMoveRequest={handleMoveFile}
                        parentFolderId={selectedFolder?._id}
                        onDelete={async () => {
                          await loadContent();
                        }}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>
                )
              ) : (
                !loadingRootFiles &&
                !loadingFolderDetails &&
                displayedFiles.length === 0 && <p className="text-gray-500 italic">No files found.</p>
              )}

              {/* Pagination */}
              {needsPagination && (
                <div className="flex justify-center items-center mt-6 gap-2">
                  <button
                    onClick={pagination.handlePrev}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {pagination.getPageNumbers().map((num, idx) =>
                    num === "..." ? (
                      <span key={idx} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={num}
                        onClick={() => pagination.handlePage(num)}
                        className={`px-3 py-1 rounded border ${pagination.currentPage === num
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                      >
                        {num}
                      </button>
                    )
                  )}
                  <button
                    onClick={pagination.handleNext}
                    disabled={pagination.currentPage === totalPages}
                    className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* -------------------------- New Folder Modal -------------------------- */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] max-w-full rounded-xl shadow-lg p-6 relative">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={() => setShowNewFolderModal(false)}>
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">New Folder</h2>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 mb-4"
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={creatingFolder}
            />
            <select
              className="w-full border rounded-lg px-3 py-2 mb-4"
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              disabled={creatingFolder}
            >
              <option value="">No Parent (Top Level)</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
            {createFolderError && <div className="text-red-600 text-sm mb-2">{createFolderError}</div>}
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300" onClick={() => setShowNewFolderModal(false)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                onClick={handleCreateFolder}
                disabled={creatingFolder}
              >
                {creatingFolder ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------- Folder Share Modal --------------------------- */}
      {showFolderShare && shareFolder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[500px] max-w-[95vw] rounded-xl shadow-lg p-6 relative">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={() => setShowFolderShare(false)}>
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>
                Share <span className="text-blue-600">"{shareFolder.name}"</span> folder
              </span>
              <button onClick={() => copyFolderLink(shareFolder)} className="p-2 rounded-lg hover:bg-gray-200" title="Copy link">
                <Copy size={18} />
              </button>
            </h2>

            <div className="mb-4">
              <Dropdown3
                label="Visibility"
                value={folderVisibility}
                onChange={setFolderVisibility}
                options={[
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" },
                ]}
                placeholder="Select visibility..."
              />
            </div>

            {folderVisibility === "private" && (
              <>
                <MultiSelectDropdown
                  label="Schools"
                  options={SCHOOL_OPTIONS}
                  value={selectedSchools}
                  onChange={setSelectedSchools}
                  placeholder="Select schools..."
                />
                <MultiSelectDropdown
                  label="Departments"
                  options={availableDepartments}
                  value={selectedDepartments}
                  onChange={setSelectedDepartments}
                  placeholder={
                    availableDepartments.length === 0 ? "Select a school first" : "Select departments..."
                  }
                />
              </>
            )}

            {/* Add people */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add People</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={folderInputEmail}
                      onChange={(e) => {
                        setFolderInputEmail(e.target.value);
                        suggestDebounced.current(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEmailToFolder();
                        }
                      }}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email"
                    />
                  </div>
                  <select
                    value={folderInputRole}
                    onChange={(e) => setFolderInputRole(e.target.value)}
                    className="border rounded-lg px-2"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                  </select>
                  <button
                    onClick={addEmailToFolder}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>

                {emailSuggestions.length > 0 && (
                  <ul className="left-0 top-full bg-white border rounded-xl shadow z-10 w-full max-h-60 overflow-y-auto">
                    {emailSuggestions.map((u) => (
                      <li
                        key={u.userId}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                        onClick={() => {
                          setFolderInputEmail(u.email);
                          setEmailSuggestions([]);
                        }}
                      >
                        {u.email}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                  <strong>Tip:</strong> Press Enter to add the person.
                </div>
              </div>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access ({folderEmails.length})</h3>
            <div className="space-y-2 mb-4">
              {folderEmails.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-800">
                    {p.email} {p.isOwner && <span className="ml-2 text-xs text-blue-600 font-semibold">(Owner)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.isOwner ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Owner</span>
                    ) : (
                      <>
                        <select
                          value={p.role}
                          onChange={(e) =>
                            setFolderEmails(folderEmails.map((x) => (x.email === p.email ? { ...x, role: e.target.value } : x)))
                          }
                          className="border rounded-lg px-2 text-sm"
                        >
                          <option value="Viewer">Viewer</option>
                          <option value="Editor">Editor</option>
                        </select>
                        <button
                          onClick={() => setFolderEmails(folderEmails.filter((x) => x.email !== p.email))}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowFolderShare(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  const allowedUsers = folderEmails
                    .filter((e) => !e.isOwner)
                    .map((e) => ({
                      userId: e.userId,
                      role: e.role,
                      email: e.email,
                      grantedBy: `${user?.firstname || ""} ${user?.lastname || ""}`.trim(),
                      emailOfGrantedBy: user?.email,
                    }));

                  if (
                    allowedUsers.length === 0 &&
                    selectedSchools.length === 0 &&
                    selectedDepartments.length === 0 &&
                    folderVisibility === "private"
                  ) {
                    toast.error("Please add at least one user, school, or department to share.");
                    return;
                  }

                  const loadingToast = toast.loading("Sharing folder...");
                  try {
                    await addAccessToFoldersAPI({
                      folderId: shareFolder._id,
                      allowedUsers,
                      allowedSchools: selectedSchools,
                      allowedDepartments: selectedDepartments,
                      visibility: folderVisibility,
                    });
                    toast.dismiss(loadingToast);
                    toast.success("Folder shared successfully!");
                    setShowFolderShare(false);
                  } catch (err) {
                    toast.dismiss(loadingToast);
                    toast.error("You are not authorized to share this folder.");
                  }
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- File Share Modal ---------------------------- */}
      {showFileShare && shareFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[500px] max-w-[95vw] rounded-xl shadow-lg p-6 relative">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={() => setShowFileShare(false)}>
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>Share "{shareFile.originalName || shareFile.name || shareFile.fileName}" file</span>
              <button onClick={() => copyFileLink(shareFile)} className="p-2 rounded-lg hover:bg-gray-200" title="Copy link">
                <Copy size={18} />
              </button>
            </h2>

            <div className="mb-3">
              <Dropdown3
                label="Visibility"
                value={fileVisibility}
                onChange={setFileVisibility}
                options={[
                  { value: "private", label: "Private" },
                  { value: "public", label: "Public" },
                ]}
                placeholder="Select visibility..."
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Add People</label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={fileInputEmail}
                onChange={(e) => setFileInputEmail(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="Enter email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmailToFile();
                  }
                }}
              />
              <select
                value={fileInputRole}
                onChange={(e) => setFileInputRole(e.target.value)}
                className="border rounded-lg px-2"
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </select>
              <button onClick={addEmailToFile} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add
              </button>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access</h3>
            <div className="space-y-2 mb-4">
              {fileEmails.map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-800">
                    {p.email} {p.isOwner && <span className="ml-2 text-xs text-blue-600 font-semibold">(Owner)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.isOwner ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Owner</span>
                    ) : (
                      <>
                        <select
                          value={p.role}
                          onChange={(e) =>
                            setFileEmails(fileEmails.map((x) => (x.email === p.email ? { ...x, role: e.target.value } : x)))
                          }
                          className="border rounded-lg px-2 text-sm"
                        >
                          <option value="Viewer">Viewer</option>
                          <option value="Editor">Editor</option>
                        </select>
                        <button
                          onClick={() => setFileEmails(fileEmails.filter((x) => x.email !== p.email))}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowFileShare(false)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  const allowedUsers = fileEmails
                    .filter((e) => !e.isOwner)
                    .map((e) => ({
                      userId: e.userId,
                      role: e.role,
                      email: e.email,
                      grantedBy: `${user?.firstname || ""} ${user?.lastname || ""}`.trim(),
                      emailOfGrantedBy: user?.email,
                    }));

                  const loadingToast = toast.loading("Sharing file...");
                  try {
                    await addAccessToFileAPI({
                      fileId: shareFile._id,
                      folderId: selectedFolder?._id,
                      allowedUsers,
                      visibility: fileVisibility,
                    });
                    toast.dismiss(loadingToast);
                    toast.success("File shared successfully!");
                    setShowFileShare(false);
                  } catch (err) {
                    toast.dismiss(loadingToast);
                    toast.error(err?.message || "You are not authorized to share this file.");
                  }
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= LIST VIEW PREVIEW MODAL ======================= */}
      {lvPreviewOpen && lvPreviewFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg shadow-lg relative flex flex-col ${lvPreviewExpanded ? "w-[95vw] h-[95vh]" : "w-[800px] max-w-[95vw] h-[90vh]"
              }`}
          >
            {/* Close */}
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
              onClick={() => setLvPreviewOpen(false)}
            >
              <X size={22} />
            </button>

            {/* Expand/Restore */}
            <button
              className="absolute top-3 right-12 text-gray-600 hover:text-black"
              onClick={() => setLvPreviewExpanded((p) => !p)}
              title={lvPreviewExpanded ? "Restore" : "Expand"}
            >
              {lvPreviewExpanded ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>

            {/* Title */}
            <h2 className="text-lg font-bold mb-4 px-6 pt-6">
              {lvPreviewFile.fileName}
            </h2>

            {/* Content */}
            <div className="flex-1 border rounded-md bg-gray-50 mx-6 overflow-hidden">
              {lvPreviewFile?.fileUrl && (
                isPdf(lvPreviewFile) ? (
                  <iframe title="PDF preview" src={lvPreviewFile.fileUrl} className="w-full h-full border-0" />
                ) : isDocx(lvPreviewFile) ? (
                  <iframe
                    title="DOCX preview"
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(lvPreviewFile.fileUrl)}&embedded=true`}
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Preview not available
                  </div>
                )
              )}
            </div>

            {/* Actions */}
            <div className="p-4 flex justify-end gap-3 border-t bg-white">
              <button
                onClick={() => toast("Download clicked")}
                className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                <Download size={18} /> Download
              </button>
              <button
                onClick={() => {
                  setItemToRemove(lvPreviewFile);
                  setRemoveType("file");
                  setShowRemoveModal(true);
                }}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                <Trash2 size={18} /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      <KebabMenuPortal anchorEl={currentAnchor} open={menuOpen} onClose={closeMenu} width={256}>
        {menuKind === "folder" && (
          <div className="py-1 text-sm text-gray-700 overflow-visible">
            {/* 1) Download */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); toast("Download clicked"); closeMenu(); }}
            ><Download size={16} className="text-gray-600" /> Download</button>

            {/* 2) Rename */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setItemToRename(displayedFolders.find(f => f._id === menuId)); setRenameType("folder"); setShowRenameModal(true); closeMenu(); }}
            ><Pencil size={16} className="text-gray-600" /> Rename</button>

            {/* ---- line after Rename ---- */}
            <div className="my-1 border-t border-gray-200" />

            {/* 3) Organize (submenu) */}
            <div className="relative group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2"><FolderCog size={16} className="text-gray-600" /> Organize</div>
                <span className="text-gray-500 text-xs">›</span>
              </div>
              <div className="absolute left-[-196px] top-0 w-48 rounded-lg border border-gray-200 bg-white shadow-xl hidden group-hover:block z-50">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => { e.stopPropagation(); const folder = displayedFolders.find(f => f._id === menuId); handleMoveFolder(folder); closeMenu(); }}
                ><Move size={16} className="text-gray-600" /> Move</button>
              </div>
            </div>

            {/* 4) Share (submenu) */}
            <div className="relative group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2"><Share2 size={16} className="text-gray-600" /> Share</div>
                <span className="text-gray-500 text-xs">›</span>
              </div>
              <div className="absolute left-[-196px] top-0 w-48 rounded-lg border border-gray-200 bg-white shadow-xl hidden group-hover:block z-50">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => { e.stopPropagation(); const folder = displayedFolders.find(f => f._id === menuId); handleFolderShareOpen(folder); closeMenu(); }}
                ><Share2 size={16} className="text-gray-600" /> Share</button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => { e.stopPropagation(); const folder = displayedFolders.find(f => f._id === menuId); copyFolderLink(folder); closeMenu(); }}
                ><Copy size={16} className="text-gray-600" /> Get Link</button>
              </div>
            </div>

            {/* ---- line before Archive ---- */}
            <div className="my-1 border-t border-gray-200" />

            {/* 5) Archive */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600"
              onClick={(e) => { e.stopPropagation(); const folder = displayedFolders.find(f => f._id === menuId); setItemToRemove(folder); setRemoveType("folder"); setShowRemoveModal(true); closeMenu(); }}
            ><Trash2 size={16} className="text-red-600" /> Archive</button>
          </div>
        )}

        {menuKind === "file" && (
          <div className="py-1 text-sm text-gray-700 overflow-visible">
            {/* 1) Download */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); toast("Download clicked"); closeMenu(); }}
            ><Download size={16} className="text-gray-600" /> Download</button>

            {/* 2) Rename */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                const targetFile =
                  displayedFiles.find(f => String(f._id) === String(menuId)) ??
                  paginatedFiles.find((_, i) => String(i) === String(menuId));
                if (!targetFile) return;
                setItemToRename(targetFile);
                setRenameType("file");
                setShowRenameModal(true);
                closeMenu();
              }}
            ><Pencil size={16} className="text-gray-600" /> Rename</button>

            {/* ---- line after Rename ---- */}
            <div className="my-1 border-t border-gray-200" />

            {/* 3) Organize (submenu) */}
            <div className="relative group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2"><FolderCog size={16} className="text-gray-600" /> Organize</div>
                <span className="text-gray-500 text-xs">›</span>
              </div>
              <div className="absolute left-[-196px] top-0 w-48 rounded-lg border border-gray-200 bg-white shadow-xl hidden group-hover:block z-50">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetFile =
                      displayedFiles.find(f => String(f._id) === String(menuId)) ??
                      paginatedFiles.find((_, i) => String(i) === String(menuId));
                    if (!targetFile) return;
                    handleMoveFile(targetFile);
                    closeMenu();
                  }}
                ><Move size={16} className="text-gray-600" /> Move</button>
              </div>
            </div>

            {/* 4) Share (submenu) */}
            <div className="relative group">
              <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2"><Share2 size={16} className="text-gray-600" /> Share</div>
                <span className="text-gray-500 text-xs">›</span>
              </div>
              <div className="absolute left-[-196px] top-0 w-48 rounded-lg border border-gray-200 bg-white shadow-xl hidden group-hover:block z-50">
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetFile =
                      displayedFiles.find(f => String(f._id) === String(menuId)) ??
                      paginatedFiles.find((_, i) => String(i) === String(menuId));
                    if (!targetFile) return;
                    handleFileShareOpen(targetFile);
                    closeMenu();
                  }}
                ><Share2 size={16} className="text-gray-600" /> Share</button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetFile =
                      displayedFiles.find(f => String(f._id) === String(menuId)) ??
                      paginatedFiles.find((_, i) => String(i) === String(menuId));
                    if (!targetFile) return;
                    copyFileLink(targetFile);
                    closeMenu();
                  }}
                ><Copy size={16} className="text-gray-600" /> Get Link</button>
              </div>
            </div>

            {/* ---- line before Archive ---- */}
            <div className="my-1 border-t border-gray-200" />

            {/* 5) Archive */}
            <button
              className="flex w-full items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                const targetFile =
                  displayedFiles.find(f => String(f._id) === String(menuId)) ??
                  paginatedFiles.find((_, i) => String(i) === String(menuId));
                if (!targetFile) return;
                setItemToRemove(targetFile);
                setRemoveType("file");
                setShowRemoveModal(true);
                closeMenu();
              }}
            ><Trash2 size={16} className="text-red-600" /> Archive</button>
          </div>
        )}
      </KebabMenuPortal>
    </div>
  );
}
