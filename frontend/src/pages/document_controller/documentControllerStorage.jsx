import React, { useMemo, useState, useEffect } from "react";
import { getFoldersAPI, getFolderByIDAPI, createFolderAPI, addDocumentsAPI } from "../../api/storageAPI";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import FolderComponent from "../../components/folder";
import FileComponent from "../../components/file";
import SearchBar from "../../components/searchBar";
import Dropdown from "../../components/dropdown";
import { Plus, ArrowLeft, FolderPlus, Upload, FolderUp, X } from "lucide-react";

// Remove mock folders, will fetch from backend

// files per folder
const FOLDER_FILES = {
  "SAMCIS Dean": [
    { name: "Dean Memo.pdf", url: "" },
    { name: "Meeting Notes.pdf", url: "" },
  ],
  "SAMCIS OSA": [{ name: "Student Report.pdf", url: "" }],
  "SAMCIS Department Heads": [{ name: "Department Plan.pdf", url: "" }],
  "TRIL Utilization": [{ name: "TRIL Usage Report.pdf", url: "" }],
  "School Clinic": [{ name: "Health Guidelines.pdf", url: "" }],
};

// root files
const ROOT_FILES = [
  { name: "Course Syllabus 2023-2024.pdf", url: "" },
  { name: "Course Syllabus 2023-2024 (2).pdf", url: "" },
  { name: "Course Syllabus 2023-2024 (3).pdf", url: "" },
];

export default function DocumentControllerStorage() {
  const user = useUser();

  // controls
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAll, setFilterAll] = useState("All");
  const [sortRecent, setSortRecent] = useState("Recent");

  // state
  const [selectedFolder, setSelectedFolder] = useState(null);
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

  // folders state from backend
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [foldersError, setFoldersError] = useState(null);

  // Fetch folders from backend on mount
  useEffect(() => {
    if (!user) return;
    setLoadingFolders(true);
    getFoldersAPI({ user })
      .then((data) => {
        console.log("Fetched folders:", data);
        // Map backend folder fields to UI folder state
        const mapped = (data.folders || []).map((f) => ({
          name: f.folderName || "Unnamed Folder",
          date: f.createdAt || "",
          _id: f._id,
          data: f 
        }));
        setFolders(mapped);
        setFoldersError(null);
      })
      .catch((err) => {
        setFoldersError(err.message || "Failed to load folders");
      })
      .finally(() => setLoadingFolders(false));
  }, [user]);

  // toggle menus
  const toggleFolderMenu = (id) =>
    setOpenFolderMenu(openFolderMenu === id ? null : id);
  const toggleFileMenu = (id) =>
    setOpenFileMenu(openFileMenu === id ? null : id);

  // folders (search + sort)
  const displayedFolders = useMemo(() => {
    let rows = [...folders];
    if (sortRecent === "Recent") {
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => f.name.toLowerCase().includes(q));
    }
    return rows;
  }, [searchQuery, sortRecent, folders]);

  // files depending on location + search
  const displayedFiles = useMemo(() => {
    let rows = selectedFolder ? FOLDER_FILES[selectedFolder] || [] : ROOT_FILES;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => (f.name || f).toLowerCase().includes(q));
    }
    return rows;
  }, [selectedFolder, searchQuery]);

  // handle create new folder 
  const [createFolderError, setCreateFolderError] = useState(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setCreateFolderError(null);
    try {
      const res = await createFolderAPI({ folderName: newFolderName.trim(), user });
      // Add the new folder to the folders state
      const f = res.folder;
      setFolders(prev => [
        ...prev,
        {
          name: f.folderName || "Unnamed Folder",
          date: f.createdAt || new Date().toISOString(),
          _id: f._id,
          data: f
        }
      ]);
      setNewFolderName("");
      setShowNewFolderModal(false);
    } catch (err) {
      setCreateFolderError(err.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Filled-Out Documents Storage" />

        {/* Main */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-6 px-8 mx-6 mt-8 rounded-xl">
          <main className="flex-1 p-8">
            {/* Title */}
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">
              FILLED-OUT DOCUMENT STORAGE
            </h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Dropdown
                options={["All"]}
                value={filterAll}
                onChange={setFilterAll}
                width="w-28"
                label="All"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              <Dropdown
                options={["Recent"]}
                value={sortRecent}
                onChange={setSortRecent}
                width="w-32"
                label="Recent"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              <div className="flex-1 min-w-[240px] md:max-w-md">
                <SearchBar
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* New button */}
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowNewMenu((prev) => !prev)}
                  className="px-4 py-2 bg-[#0035DA] hover:bg-[#043485] text-white rounded-lg shadow flex items-center gap-2"
                >
                  <Plus size={18} /> New
                </button>

                {showNewMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setShowNewFolderModal(true);
                        setShowNewMenu(false);
                      }}
                    >
                      <FolderPlus size={18} /> New Folder
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setShowNewMenu(false);
                        if (!selectedFolder) {
                          alert('Please select a folder to upload files.');
                          return;
                        }
                        document.getElementById('upload-documents-global').click();
                      }}
                    >
                      <Upload size={18} /> Upload File
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <FolderUp size={18} /> Upload Folder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Inside folder */}
            {selectedFolder && (
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg shadow text-white bg-[#0035DA] hover:bg-[#043485]"
                >
                  <ArrowLeft size={18} /> Back
                </button>

                <div className="text-gray-600 text-sm font-medium">
                  Storage <span className="mx-1">/</span>
                  <span className="text-gray-900">{selectedFolder.folderName || selectedFolder.name}</span>
                </div>
              </div>
            )}

            {/* Root view or folder view */}
            {!selectedFolder ? (
              <>
                {/* Folders */}
                <h3 className="text-lg font-semibold mb-3">Folders</h3>
                {displayedFolders.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                    {displayedFolders.map((folder, idx) => (
                      <FolderComponent
                        key={folder._id}
                        folder={folder}
                        index={idx}
                        isMenuOpen={openFolderMenu === idx}
                        toggleMenu={toggleFolderMenu}
                        onClick={async () => {
                          try {
                            const data = await getFolderByIDAPI(folder._id);
                            console.log("Fetched folder details:", data);
                            setSelectedFolder(data.folder);
                          } catch (err) {
                            alert('Failed to fetch folder details.');
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic mb-8">No folders found.</p>
                )}

                {/* Files */}
                <h3 className="text-lg font-semibold mb-3">Files</h3>
                {displayedFiles.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayedFiles.map((file, idx) => (
                      <FileComponent
                        key={file._id || file.name || idx}
                        file={file}
                        index={idx}
                        isMenuOpen={openFileMenu === `file-${idx}`}
                        toggleMenu={toggleFileMenu}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No files found.</p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-3">
                  Files in {selectedFolder.folderName || selectedFolder.name}
                </h3>
                {/* Hidden global file input for upload via +New menu */}
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
                      const res = await addDocumentsAPI(selectedFolder._id, files,user._id);
                      setSelectedFolder((prev) => ({ ...prev, dbfiles: res.folder.files }));
                      e.target.value = "";
                    } catch (err) {
                      setUploadError(err.message || "Failed to upload files");
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                />
                {uploading && <span className="text-blue-600 text-sm">Uploading...</span>}
                {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}
                {/* Use dbfiles or physicalFiles if present, else fallback */}
                {((selectedFolder.dbfiles && selectedFolder.dbfiles.length) || (selectedFolder.physicalFiles && selectedFolder.physicalFiles.length)) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(selectedFolder.dbfiles && selectedFolder.dbfiles.length ? selectedFolder.dbfiles : selectedFolder.physicalFiles).map((file, idx) => (
                      <FileComponent
                        key={file._id || file.name || idx}
                        file={file}
                        index={idx}
                        isMenuOpen={openFileMenu === `file-${idx}`}
                        toggleMenu={toggleFileMenu}
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
