import React, { useMemo, useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import FolderComponent from "../../components/folder";
import FileComponent from "../../components/file";
import SearchBar from "../../components/searchBar";
import Dropdown from "../../components/dropdown";
import { Plus, ArrowLeft, FolderPlus, Upload, FolderUp } from "lucide-react";

// initial folders with dates (for "Recent" sort demo)
const INITIAL_FOLDERS = [
  { name: "SAMCIS Dean", date: "2024-01-10" },
  { name: "SAMCIS OSA", date: "2024-03-05" },
  { name: "SAMCIS Department Heads", date: "2024-02-15" },
  { name: "TRIL Utilization", date: "2024-04-01" },
  { name: "School Clinic", date: "2024-05-12" },
];

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

// root files (default)
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

  // dropdown (new actions)
  const [showNewMenu, setShowNewMenu] = useState(false);

  // toggle menus
  const toggleFolderMenu = (id) =>
    setOpenFolderMenu(openFolderMenu === id ? null : id);
  const toggleFileMenu = (id) =>
    setOpenFileMenu(openFileMenu === id ? null : id);

  // folders (search + sort by recent)
  const displayedFolders = useMemo(() => {
    let rows = [...INITIAL_FOLDERS];
    if (sortRecent === "Recent") {
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => f.name.toLowerCase().includes(q));
    }
    return rows;
  }, [searchQuery, sortRecent]);

  // files depending on location + search
  const displayedFiles = useMemo(() => {
    let rows = selectedFolder ? FOLDER_FILES[selectedFolder] || [] : ROOT_FILES;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((f) => (f.name || f).toLowerCase().includes(q));
    }
    return rows;
  }, [selectedFolder, searchQuery]);

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

              {/* New button (root or inside folder) */}
              <div className="ml-auto relative">
                <button
                  onClick={() => setShowNewMenu((prev) => !prev)}
                  className="px-4 py-2 bg-[#0035DA] hover:bg-[#043485] text-white rounded-lg shadow flex items-center gap-2"
                >
                  <Plus size={18} /> New
                </button>

                {showNewMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <FolderPlus size={18} /> New Folder
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <Upload size={18} /> Upload File
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <FolderUp size={18} /> Upload Folder
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* If inside a folder: breadcrumb */}
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
                  <span className="text-gray-900">{selectedFolder}</span>
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
                        key={folder.name}
                        folder={folder}
                        index={idx}
                        isMenuOpen={openFolderMenu === idx}
                        toggleMenu={toggleFolderMenu}
                        onClick={(name) => setSelectedFolder(name)}
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
                        key={typeof file === "string" ? file : file.name}
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
                {/* Folder contents */}
                <h3 className="text-lg font-semibold mb-3">
                  Files in {selectedFolder}
                </h3>
                {displayedFiles.length ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayedFiles.map((file, idx) => (
                      <FileComponent
                        key={typeof file === "string" ? file : file.name}
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
    </div>
  );
}
