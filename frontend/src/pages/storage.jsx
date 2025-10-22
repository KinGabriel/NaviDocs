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
import { Plus, ArrowLeft, FolderPlus, Upload, FolderUp, X, ListFilter, ChevronRight } from "lucide-react";

export default function Storage() {
  const { id } = useParams(); // Get folder ID from URL
  const navigate = useNavigate();
  const user = useUser();

  // File view mode: 'grid' or 'list'
  const [fileViewMode, setFileViewMode] = useState("grid");

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

const FileViewToggle = ({ mode, onChange }) => {
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-full overflow-hidden">
      {/* Table View */}
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 flex items-center transition-all duration-150 ${
          mode === "table"
            ? "bg-blue-100 text-blue-700"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
        aria-label="Table view"
        title="Table view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Grid View */}
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`px-3 py-2 flex items-center transition-all duration-150 ${
          mode === "grid"
            ? "bg-blue-100 text-blue-700"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
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
};


  // When opening the new folder modal, default parentFolderId to the currently selected folder
  useEffect(() => {
    if (showNewFolderModal) {
      if (selectedFolder && selectedFolder._id) {
        setParentFolderId(selectedFolder._id);
      } else {
        setParentFolderId("");
      }
    }
  }, [showNewFolderModal, selectedFolder]);

  // Load content when URL changes or status changes
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
      console.log('=== Loading folder by ID:', folderId, '===');
      
      // Get all folders first (needed for breadcrumb building)
      const allFoldersData = await getFoldersAPI({ user, status: selectedStatus });
      console.log('Raw folders from API:', allFoldersData.folders?.length);
      
      const mapped = (allFoldersData.folders || []).map((f) => ({
        name: f.folderName || "Unnamed Folder",
        date: f.createdAt || "",
        _id: f._id,
        data: {
          ...f,
          parentFolder: f.parentFolder ? String(f.parentFolder) : null
        }
      }));
      
      console.log('Mapped folders:', mapped.map(f => ({ 
        id: f._id, 
        name: f.name, 
        parent: f.data.parentFolder 
      })));
      
      setFolders(mapped);
      
      // Get folder details
      const folderData = await getFolderByIDAPI(folderId, user._id, selectedStatus);
      console.log('Current folder from API:', {
        name: folderData.folder?.folderName,
        id: folderData.folder?._id,
        parent: folderData.folder?.parentFolder
      });
      
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

  const buildBreadcrumbs = (folder, allFolders) => {
    if (!folder || !allFolders || allFolders.length === 0) {
      console.log('Cannot build breadcrumbs: missing data', { folder, foldersCount: allFolders?.length });
      return;
    }

    const trail = [];
    const visited = new Set();
    let currentId = folder.parentFolder;
    
    console.log('Building breadcrumbs for:', folder.folderName || folder.name, 'ID:', folder._id);
    console.log('Parent ID:', currentId);
    console.log('Available folders:', allFolders.map(f => ({ id: f._id, name: f.name, parent: f.data?.parentFolder })));
    
    // Build parent chain from bottom to top
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const parent = allFolders.find(f => f._id === currentId);
      console.log('Looking for parent:', currentId, 'Found:', parent?.name);
      
      if (parent) {
        trail.unshift({ 
          name: parent.name, 
          id: parent._id, 
          data: parent.data 
        });
        currentId = parent.data?.parentFolder;
      } else {
        console.log('Parent not found, breaking');
        break;
      }
    }
    
    // Add current folder at the end
    trail.push({ 
      name: folder.folderName || folder.name, 
      id: folder._id, 
      data: folder 
    });
    
    console.log('Final breadcrumb trail:', trail.map(t => t.name));
    setFolderPath(trail);
  };

  // Navigation functions
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
      console.log('Folders not loaded yet, skipping breadcrumb build');
      return;
    }

    console.log('Building breadcrumbs from useEffect');
    console.log('Selected folder:', selectedFolder.folderName || selectedFolder.name, 'ID:', selectedFolder._id);
    console.log('Parent:', selectedFolder.parentFolder);
    console.log('Total folders available:', folders.length);

    const buildPath = (folderId) => {
      const path = [];
      let currentId = folderId;
      const visited = new Set();
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const folder = folders.find(f => f._id === currentId);
        console.log('Looking for folder ID:', currentId, 'Found:', folder?.name);
        
        if (folder) {
          path.unshift({
            id: folder._id,
            name: folder.name,
            data: folder.data
          });
          currentId = folder.data?.parentFolder;
          console.log('Next parent ID:', currentId);
        } else {
          console.log('Folder not found, breaking');
          break;
        }
      }
      
      return path;
    };

    const path = buildPath(selectedFolder._id);
    console.log('Final path:', path.map(p => p.name));
    setFolderPath(path);
  }, [selectedFolder, folders]);
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenFolderMenu(null);
      setOpenFileMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Toggle menus
  const toggleFolderMenu = (id) =>
    setOpenFolderMenu(openFolderMenu === id ? null : id);
  const toggleFileMenu = (id) =>
    setOpenFileMenu(openFileMenu === id ? null : id);

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

  // Handle create new folder
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

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Filled-Out Documents Storage" />
        
        {/* Move Modal */}
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
          {/* Title */}
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
            </div>
          </div>
          
          <div className="border-t border-gray-200 mb-4"></div>

          {/* Show loader for initial loading */}
          {isInitialLoading ? (
            <Loader message="Loading storage..." />
          ) : (
            <>
              {/* Folders */}
              <h3 className="text-lg font-semibold mb-3">Folders</h3>
              {loadingFolders ? (
                <Loader message="Loading folders..." />
              ) : displayedFolders.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {displayedFolders.map((folder, idx) => (
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
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic mb-8">No folders found.</p>
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
              <div className="flex items-center justify-between mb-3">
  <h3 className="text-lg font-semibold">
    {selectedFolder ? `Files in ${selectedFolder.folderName}` : 'Files'}
  </h3>
  <FileViewToggle mode={fileViewMode} onChange={setFileViewMode} />

</div>

              {loadingRootFiles || loadingFolderDetails ? (
                <Loader message="Loading files..." />
              ) : displayedFiles.length ? (
                <div
  className={
    fileViewMode === "grid"
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
      : "flex flex-col divide-y"
  }
>
  {displayedFiles.map((file, idx) => (
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
      viewMode={fileViewMode} // optional if FileComponent supports layout variation
    />
  ))}
</div>

              ) : (
                <p className="text-gray-500 italic">No files found.</p>
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