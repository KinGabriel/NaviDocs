import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';
import { Folder, FileText, Plus, Filter, ArrowDownAZ, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DocumentControllerStorage() {
  const user = useUser();
  const navigate = useNavigate();

  const initialFolders = [
    { name: "SAMCIS Dean", date: "2024-01-10" },
    { name: "SAMCIS OSA", date: "2024-03-05" },
    { name: "SAMCIS Department Heads", date: "2024-02-15" },
    { name: "TRIL Utilization", date: "2024-04-01" },
    { name: "School Clinic", date: "2024-05-12" }
  ];

  // Dummy files per folder
  const folderFiles = {
    "SAMCIS Dean": ["Dean Memo.pdf", "Meeting Notes.docx", "Course Syllabus.pdf"],
    "SAMCIS OSA": ["OSA Budget.xlsx", "Student Report.pdf"],
    "SAMCIS Department Heads": ["Head Memo.pdf", "Department Plan.docx"],
    "TRIL Utilization": ["TRIL Usage Report.pdf", "Equipment List.xlsx"],
    "School Clinic": ["Medical Records.pdf", "Health Guidelines.docx"],
  };

  // Default (root) files
  const rootFiles = new Array(7).fill("Course Syllabus 2023-2024");

  const [folders] = useState(initialFolders);
  const [files] = useState(rootFiles);
  const [sortAZ, setSortAZ] = useState(false);
  const [filterLatest, setFilterLatest] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Apply filter + sort on folders
  let displayedFolders = [...folders]
    .sort((a, b) => {
      if (filterLatest) return new Date(b.date) - new Date(a.date);
      return 0;
    })
    .sort((a, b) => {
      if (sortAZ) return a.name.localeCompare(b.name);
      return 0;
    });

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    if (!selectedFolder) {
      // root: search both folders + files
      displayedFolders = displayedFolders.filter((f) =>
        f.name.toLowerCase().includes(query)
      );
    }
  }

  // Files depending on where we are
  let displayedFiles = [];
  if (selectedFolder) {
    displayedFiles = folderFiles[selectedFolder] || [];
    if (searchQuery) {
      displayedFiles = displayedFiles.filter((file) =>
        file.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  } else {
    displayedFiles = searchQuery
      ? files.filter((file) => file.toLowerCase().includes(searchQuery.toLowerCase()))
      : files;
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Filled-Out Documents Storage" />

        {/* Main Container */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            {/* Title */}
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">
              FILLED-OUT DOCUMENT STORAGE
            </h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setFilterLatest(!filterLatest)}
                className="flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-blue-600 hover:bg-blue-700"
              >
                <Filter size={18} /> Filter
              </button>

              <button
                onClick={() => setSortAZ(!sortAZ)}
                className="flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowDownAZ size={18} /> Sort
              </button>

              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {!selectedFolder && (
                <div className="flex-1 flex justify-end">
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md shadow">
                    <Plus size={20} /> Add Folder
                  </button>
                </div>
              )}
            </div>

            {/* If inside a folder */}
            {selectedFolder ? (
              <>
                {/* Breadcrumb + Back */}
                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md shadow text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowLeft size={18} /> Back
                  </button>

                  {/* Breadcrumb */}
                  <div className="text-gray-600 text-sm font-medium">
                    Storage <span className="mx-1">/</span>
                    <span className="text-gray-900">{selectedFolder}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3">Files in {selectedFolder}</h3>

                {displayedFiles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayedFiles.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => navigate('/document-controller/create-template')}
                        className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                      >
                        <div className="absolute -top-2 right-3">
                          <span className="px-2 py-0.5 text-xs rounded-full border bg-white text-gray-700">
                            Draft
                          </span>
                        </div>

                        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-t-xl">
                          <FileText className="w-10 h-10 text-gray-300" />
                        </div>

                        <div className="border-t px-3 py-3 rounded-b-xl">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {file}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Filled-out document
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No files found.</p>
                )}
              </>
            ) : (
              <>
                {/* Root view: Folders + Files */}
                <h3 className="text-lg font-semibold mb-3">Folders</h3>
                {displayedFolders.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                    {displayedFolders.map((folder, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedFolder(folder.name)}
                        className="bg-gray-100 flex items-center gap-3 p-4 shadow-sm rounded-md border border-gray-300 cursor-pointer hover:bg-gray-200"
                      >
                        <Folder size={28} className="text-blue-600 flex-shrink-0 w-7 h-7" />
                        <span className="font-medium text-gray-800 truncate flex-1">
                          {folder.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic mb-8">No folders found.</p>
                )}

                <h3 className="text-lg font-semibold mb-3">Files</h3>
                {displayedFiles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayedFiles.map((file, index) => (
                      <div
                        key={index}
                        onClick={() => navigate('/document-controller/create-template')}
                        className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
                      >
                        <div className="absolute -top-2 right-3">
                          <span className="px-2 py-0.5 text-xs rounded-full border bg-white text-gray-700">
                            Draft
                          </span>
                        </div>

                        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-t-xl">
                          <FileText className="w-10 h-10 text-gray-300" />
                        </div>

                        <div className="border-t px-3 py-3 rounded-b-xl">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {file}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Filled-out document
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No files found.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
