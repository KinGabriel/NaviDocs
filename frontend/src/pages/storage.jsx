import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { getFoldersAPI, getFolderByIDAPI, createFolderAPI, addDocumentsAPI, addOrphanFileAPI, getOrphanFilesAPI, moveFolderAPI, moveFileAPI } from "../api/storageAPI";
import Header from "../layout/headers/header";
import Sidebar from "../layout/sidebars/sidebar";
import useUser from "../hooks/useUser";
import FolderComponent from "../components/folder";
import FileComponent from "../components/file";
import SearchBar from "../components/searchbar";
import Dropdown from "../components/dropdowns/dropdown";
import MoveModal from "../components/modals/moveModal";
import Loader from "../components/loader";
import { Plus, ArrowLeft, FolderPlus, Upload, FolderUp, X, ChevronRight, Folder, File, MoreVertical, Download, Pencil, FolderCog, Move, Share2, Copy, Trash2 } from "lucide-react";
import { formatDate } from "../utils/formatters";

// View Toggle Component
function ViewToggle({ mode = "table", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 flex items-center ${isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
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
        className={`px-3 py-2 flex items-center ${!isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
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

export default function Storage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useUser();

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState("table");

  // Orphan/root files state
  const [rootFiles, setRootFiles] = useState([]);
  const [loadingRootFiles, setLoadingRootFiles] = useState(true);
  const [uploadingOrphan, setUploadingOrphan] = useState(false);
  const [uploadOrphanError, setUploadOrphanError] = useState(null);

  // controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortRecent, setSortRecent] = useState("Sort by");

  // Status options for filtering
  const statusOptions = [
    'Owned by anyone',
    'Owned by me',
    'Not owned by me'
  ];

  const [selectedStatus, setSelectedStatus] = useState('Owned by anyone');

  // state
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loadingFolderDetails, setLoadingFolderDetails] = useState(false);
  const [openFolderMenu, setOpenFolderMenu] = useState(null);
  const [openFileMenu, setOpenFileMenu] = useState(null);
  const [renameType, setRenameType] = useState("folder"); // "folder" or "file"
  const [removeType, setRemoveType] = useState("folder");
  
  // Submenu states for table view
  const [openOrganizeSubmenu, setOpenOrganizeSubmenu] = useState(null);
  const [openShareSubmenu, setOpenShareSubmenu] = useState(null);
  
  // document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // dropdown (new actions)
  const [showNewMenu, setShowNewMenu] = useState(false);

  // new folder modal
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState("");

  // Breadcrumb navigation state
  const [folderPath, setFolderPath] = useState([]);
  
  // folders state from backend
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [foldersError, setFoldersError] = useState(null);

  // Create folder error state
  const [createFolderError, setCreateFolderError] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Move modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [itemToMove, setItemToMove] = useState(null);
  const [moveType, setMoveType] = useState("folder");

  // Pagination - 10 folders + 10 files per page
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    if (showNewFolderModal) {
      if (selectedFolder && selectedFolder._id) {
        setParentFolderId(selectedFolder._id);
      } else {
        setParentFolderId("");
      }
    }
  }, [showNewFolderModal, selectedFolder]);

  useEffect(() => {
    if (!user || !user._id) return;
    loadContent();
  }, [id, user, selectedStatus]);

  const loadContent = async () => {
    if (!user) return;
    
    setLoadingFolders(true);
    setLoadingRootFiles(true);
    setLoadingFolderDetails(true);
    
    try {
      if (!id) {
        // Load root content
        await loadRootContent();
      } else {
        // Load specific folder
        await loadFolderById(id);
      }
    } catch (err) {
      console.error('Error loading content:', err);
      // Redirect to root if folder not found
      if (err.message?.includes('not found') || err.status === 404) {
        navigate('/storage');
      }
    }
  };

  const loadRootContent = async () => {
    try {
      // Get all folders
      const foldersData = await getFoldersAPI({ user, status: selectedStatus });
      const mapped = (foldersData.folders || []).map((f) => ({
        name: f.folderName || "Unnamed Folder",
        date: f.createdAt || "",
        _id: f._id,
        data: {
          ...f,
          parentFolder: f.parentFolder ? String(f.parentFolder) : null
        }
      }));
      setFolders(mapped);
      
      // Get orphan files
      const orphanFiles = await getOrphanFilesAPI(user._id, selectedStatus);
      setRootFiles(orphanFiles.files || []);
      
      setSelectedFolder(null);
      setFolderPath([]);
      setFoldersError(null);
    } catch (err) {
      setFoldersError(err.message || "Failed to load folders");
      setRootFiles([]);
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
        data: {
          ...f,
          parentFolder: f.parentFolder ? String(f.parentFolder) : null
        }
      }));
      
      setFolders(mapped);
      
      const folderData = await getFolderByIDAPI(folderId, user._id, selectedStatus);
      setSelectedFolder(folderData.folder);
      
      setFoldersError(null);
    } catch (err) {
      console.error('Error loading folder:', err);
      setFoldersError(err.message || "Failed to load folder");
      navigate('/storage');
    } finally {
      setLoadingFolders(false);
      setLoadingRootFiles(false);
      setLoadingFolderDetails(false);
    }
  };

  const openFolder = (folderId) => {
    navigate(`/storage/folders/${folderId}`);
  };

  const navigateToFolder = (folderId) => {
    if (folderId) {
      navigate(`/storage/folders/${folderId}`);
    } else {
      navigate('/storage');
    }
  };

  const goBack = () => {
    if (selectedFolder?.parentFolder) {
      navigate(`/storage/folders/${selectedFolder.parentFolder}`);
    } else {
      navigate('/storage');
    }
  };

  // Build breadcrumb path when selectedFolder or folders changes
  useEffect(() => {
    if (!selectedFolder || !selectedFolder._id) {
      setFolderPath([]);
      return;
    }

    if (folders.length === 0) {
      return;
    }

    const buildPath = (folderId) => {
      const path = [];
      let currentId = folderId;
      const visited = new Set();
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const folder = folders.find(f => f._id === currentId);
        
        if (folder) {
          path.unshift({
            id: folder._id,
            name: folder.name,
            data: folder.data
          });
          currentId = folder.data?.parentFolder;
        } else {
          break;
        }
      }
      
      return path;
    };

    const path = buildPath(selectedFolder._id);
    setFolderPath(path);
  }, [selectedFolder, folders]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenFolderMenu(null);
      setOpenFileMenu(null);
      setOpenOrganizeSubmenu(null);
      setOpenShareSubmenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

// Toggle menus
const toggleFolderMenu = (id, e) => {
  if (e) e.stopPropagation();
  setOpenFolderMenu(openFolderMenu === id ? null : id);
};

const toggleFileMenu = (id, e) => {
  if (e) e.stopPropagation();
  setOpenFileMenu(openFileMenu === id ? null : id);
};

  // Folders (search + sort)
  const displayedFolders = useMemo(() => {
    let rows = [...folders];
    // Only show folders whose parent matches the selected folder (or top-level if none selected)
    if (selectedFolder && selectedFolder._id) {
      rows = rows.filter(f => f.data.parentFolder === selectedFolder._id);
    } else {
      rows = rows.filter(f => !f.data.parentFolder);
    }
    if (sortRecent === "Recent") {
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => f.name.toLowerCase().includes(q));
    }
    return rows;
  }, [searchQuery, sortRecent, folders, selectedFolder]);

  // Files depending on location + search
  const displayedFiles = useMemo(() => {
    let rows = selectedFolder ? (selectedFolder.dbfiles || []) : rootFiles;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => (f.name || f.originalName || f.fileName || "").toLowerCase().includes(q));
    }
    return rows;
  }, [selectedFolder, searchQuery, rootFiles]);

  const totalFolderPages = Math.ceil(displayedFolders.length / itemsPerPage);
  const totalFilePages = Math.ceil(displayedFiles.length / itemsPerPage);
  const totalPages = Math.max(totalFolderPages, totalFilePages, 1);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortRecent, selectedStatus, id]);

  const paginatedFolders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return displayedFolders.slice(startIndex, endIndex);
  }, [displayedFolders, currentPage, itemsPerPage]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return displayedFiles.slice(startIndex, endIndex);
  }, [displayedFiles, currentPage, itemsPerPage]);

  const pagination = {
    currentPage,
    totalPages,
    handlePrev: () => setCurrentPage(p => Math.max(1, p - 1)),
    handleNext: () => setCurrentPage(p => Math.min(totalPages, p + 1)),
    handlePage: (num) => setCurrentPage(num),
    getPageNumbers: () => {
      const pages = [];
      const maxVisible = 5;
      
      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push("...");
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push("...");
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push("...");
          pages.push(currentPage - 1);
          pages.push(currentPage);
          pages.push(currentPage + 1);
          pages.push("...");
          pages.push(totalPages);
        }
      }
      
      return pages;
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setCreateFolderError(null);
    try {
      await createFolderAPI({ 
        folderName: newFolderName.trim(), 
        user, 
        parentFolder: parentFolderId || null 
      });
      
      // Reload content to reflect new folder
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

  // Move handler for folders
  const handleMoveFolder = (folder) => {
    setItemToMove(folder);
    setMoveType("folder");
    setShowMoveModal(true);
  };

  // Move handler for files
  const handleMoveFile = (file) => {
    setItemToMove(file);
    setMoveType("file");
    setShowMoveModal(true);
  };

  // Actually move folder or file
  const handleMove = async (destinationId) => {
    if (!itemToMove) return;
    
    try {
      if (moveType === "folder") {
        await moveFolderAPI(itemToMove._id, destinationId);
      } else if (moveType === "file") {
        const currentFolderId = selectedFolder ? selectedFolder._id : null;
        await moveFileAPI(itemToMove._id, destinationId, currentFolderId);
      }
      
      // Reload content after move
      await loadContent();
    } catch (err) {
      alert(err.message || "Failed to move item");
    } finally {
      setShowMoveModal(false);
      setItemToMove(null);
    }
  };
  // Show main loader when initial data is loading
  const isInitialLoading = (loadingFolders || loadingFolderDetails) && folders.length === 0 && !selectedFolder;
  const needsPagination = displayedFolders.length > itemsPerPage || displayedFiles.length > itemsPerPage;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Filled-Out Documents Storage" />
        
        <MoveModal
          folders={folders}
          open={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMove}
          itemToMove={itemToMove}
          type={moveType}
        />

      {/* Main */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          {!selectedFolder && (
            <>
              <h1 className="text-3xl font-semibold mt-8 tracking-wide">
                DOCUMENT STORAGE
              </h1>
              <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />
            </>
          )}

          {/* Breadcrumb Navigation */}
          {selectedFolder && (
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#0035DA] hover:bg-blue-50 transition-all duration-200 font-medium mt-4"
              >
                <ArrowLeft size={18} /> Back
              </button>
              
              {/* Breadcrumb */}
              <div className="flex items-center text-sm font-medium mt-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <button
                  onClick={() => navigateToFolder(null)}
                  className="text-gray-600 hover:text-[#0035DA] hover:underline transition-colors flex-shrink-0"
                >
                  Storage
                </button>

                {/* Compute visible breadcrumb parts */}
                {(() => {
                  const maxVisible = 3;
                  if (folderPath.length <= maxVisible) {
                    return folderPath.map((folder, index) => (
                      <React.Fragment key={folder.id}>
                        <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                        <button
                          onClick={() => navigateToFolder(folder.id)}
                          className={`truncate max-w-[120px] text-ellipsis overflow-hidden transition-colors ${
                            index === folderPath.length - 1
                              ? "text-[#0035DA] font-semibold cursor-default"
                              : "text-gray-600 hover:text-[#0035DA] hover:underline"
                          }`}
                          disabled={index === folderPath.length - 1}
                          title={folder.name}
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    ));
                  } else {
                    const last = folderPath[folderPath.length - 1];
                    const middle = folderPath.slice(-2, -1)[0];

                    return (
                      <>
                        <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                        <span className="text-gray-400 select-none">…</span>
                        <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />

                        {[middle, last].map((folder, index) => (
                          <React.Fragment key={folder.id}>
                            {index > 0 && (
                              <ChevronRight className="mx-1 text-gray-400 flex-shrink-0" size={16} />
                            )}
                            <button
                              onClick={() => navigateToFolder(folder.id)}
                              className={`truncate max-w-[120px] text-ellipsis overflow-hidden transition-colors ${
                                folder.id === last.id
                                  ? "text-[#0035DA] font-semibold cursor-default"
                                  : "text-gray-600 hover:text-[#0035DA] hover:underline"
                              }`}
                              disabled={folder.id === last.id}
                              title={folder.name}
                            >
                              {folder.name}
                            </button>
                          </React.Fragment>
                        ))}
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-6 mb-3 bg-gray-50/50 p-3 rounded-lg">
            <div className="flex items-center gap-4">
              {/* New Button */}
              <div className="relative">
                <button
                  onClick={() => setShowNewMenu((prev) => !prev)}
                  className="bg-blue-700 text-white px-5 py-2 rounded font-semibold text-sm flex items-center gap-2 hover:bg-blue-800 focus:outline-none focus:ring-0"
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
                        if (selectedFolder) {
                          document.getElementById("upload-documents-global").click();
                        } else {
                          document.getElementById("upload-orphan-files").click();
                        }
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

              {/* Status Filter Tabs */}
              <div className="flex gap-1 ml-2">
                {statusOptions.map((status) => {
                  const isSelected = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 border ${
                        isSelected
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

            {/* Sort & Search */}
            <div className="flex items-center gap-3">
              <Dropdown
                options={["Last Modified", "Date Created", "Title"]}
                value={sortRecent}
                onChange={setSortRecent}
                width="w-36"
                label="Sort"
                buttonClass="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm px-3 py-2.5 shadow-sm"
              />

              <div className="w-60">
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
              {/* Folders */}
              <h3 className="text-lg font-semibold mb-3">Folders</h3>
              {loadingFolders ? (
                <Loader message="Loading folders..." />
              ) : paginatedFolders.length ? (
                viewMode === "table" ? (
                  // Table View for Folders
                  <div className="overflow-x-auto mb-8 border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Modified</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedFolders.map((folder, idx) => (
                          <tr 
                            key={folder._id} 
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => openFolder(folder._id)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900">{folder.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {folder.data?.owner?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {formatDate(folder.date)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <button
                                    onClick={(e) => toggleFolderMenu(`folder-${folder._id}`, e)}
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
                                          console.log("Download folder");
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
                                                console.log("Share folder");
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
                                                console.log("Copy link");
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Grid View for Folders
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
                !loadingFolders && displayedFolders.length === 0 && (
                  <p className="text-gray-500 italic mb-8">No folders found.</p>
                )
              )}
              
              {!loadingFolders && paginatedFolders.length === 0 && displayedFolders.length > 0 && (
                <p className="text-gray-500 italic mb-8">No folders on this page.</p>
              )}

              {/* File Upload Inputs */}
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
                    await addDocumentsAPI(selectedFolder._id, files, user._id, selectedFolder.owner);
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

              {/* Files */}
              <h3 className="text-lg font-semibold mb-3">
                {selectedFolder ? `Files in ${selectedFolder.folderName}` : 'Files'}
              </h3>
              {loadingRootFiles || loadingFolderDetails ? (
                <Loader message="Loading files..." />
              ) : paginatedFiles.length ? (
                viewMode === "table" ? (
                  // Table View for Files
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Last Modified</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedFiles.map((file, idx) => {
                          const fileName = file.name || file.originalName || file.fileName || 'Untitled';
                          const fileSize = file.size ? `${(file.size / 1024).toFixed(2)} KB` : '-';
                          
                          return (
                            <tr 
                              key={file._id || idx} 
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-900">{fileName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {file.owner?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDate(file.uploadedAt || file.createdAt)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {fileSize}
                              </td>
                              <td className="px-6 py-4">
                                <div className="relative">
                                  <button
                                    onClick={(e) => toggleFileMenu(`file-${file._id || idx}`, e)}
                                    className="p-1 rounded-full hover:bg-gray-300"
                                  >
                                    <MoreVertical className="w-5 h-5 text-gray-600" />
                                  </button>
                                  {openFileMenu === `file-${file._id || idx}` && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                                      <ul className="text-sm text-gray-700">
                                        <li
                                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log("Download file");
                                            setOpenFileMenu(null);
                                          }}
                                        >
                                          <Download size={16} className="text-gray-600" /> Download
                                        </li>
                                       <li
                                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
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
                                          onMouseEnter={() => setOpenOrganizeSubmenu(`file-${file._id || idx}`)}
                                          onMouseLeave={() => setOpenOrganizeSubmenu(null)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <FolderCog size={16} className="text-gray-600" /> Organize
                                          </div>
                                          <span className="text-gray-500 text-xs">▶</span>
                                          {openOrganizeSubmenu === `file-${file._id || idx}` && (
                                            <ul className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50">
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoveFile(file);
                                                  setOpenFileMenu(null);
                                                }}
                                              >
                                                <Move size={16} className="text-gray-600" /> Move
                                              </li>
                                            </ul>
                                          )}
                                        </li>
                                        <li
                                          className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                          onMouseEnter={() => setOpenShareSubmenu(`file-${file._id || idx}`)}
                                          onMouseLeave={() => setOpenShareSubmenu(null)}
                                        >
                                          <div className="flex items-center gap-2">
                                            <Share2 size={16} className="text-gray-600" /> Share
                                          </div>
                                          <span className="text-gray-500 text-xs">▶</span>
                                          {openShareSubmenu === `file-${file._id || idx}` && (
                                            <ul 
                                              className="absolute top-0 right-full mr-1 w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50"
                                              onMouseEnter={() => setOpenShareSubmenu(`file-${file._id || idx}`)}
                                              onMouseLeave={() => setOpenShareSubmenu(null)}
                                            >
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  console.log("Share file");
                                                  setOpenFileMenu(null);
                                                }}
                                              >
                                                <Share2 size={16} className="text-gray-600" /> Share
                                              </li>
                                              <li
                                                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  console.log("Copy link");
                                                  setOpenFileMenu(null);
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  // Grid View for Files
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
                !loadingRootFiles && !loadingFolderDetails && displayedFiles.length === 0 && (
                  <p className="text-gray-500 italic">No files found.</p>
                )
              )}
              
              {!loadingRootFiles && !loadingFolderDetails && paginatedFiles.length === 0 && displayedFiles.length > 0 && (
                <p className="text-gray-500 italic">No files on this page.</p>
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
                        className={`px-3 py-1 rounded border ${
                          pagination.currentPage === num
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

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] max-w-full rounded-xl shadow-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setShowNewFolderModal(false)}
            >
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
              onChange={e => setParentFolderId(e.target.value)}
              disabled={creatingFolder}
            >
              <option value="">No Parent (Top Level)</option>
              {folders.map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
            {createFolderError && (
              <div className="text-red-600 text-sm mb-2">{createFolderError}</div>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowNewFolderModal(false)}
              >
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
    </div>
  );
}