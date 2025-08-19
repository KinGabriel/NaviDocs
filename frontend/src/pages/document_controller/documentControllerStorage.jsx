import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser';
import { Folder, FileText, Plus } from "lucide-react";

export default function DocumentControllerStorage() {
  const user = useUser();

  const folders = [
    "SAMCIS Dean",
    "SAMCIS OSA",
    "SAMCIS Department Heads",
    "TRIL Utilization",
    "School Clinic"
  ];

  const files = new Array(12).fill("Course Syllabus 2023-2024"); // dummy files

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Filled-Out Documents Storage" />

        {/* Main Container */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            {/* Title + underline */}
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">
              FILLED-OUT DOCUMENT STORAGE
            </h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Controls */}
            <div className="flex items-center gap-2 mb-6">
              <button className="bg-blue-600 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow">
                Filter by
              </button>
              <button className="bg-blue-600 hover:bg-blue-600 text-white px-4 py-2 rounded-md shadow">
                Sort by
              </button>
              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex-1 flex justify-end">
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-600 text-white font-medium px-5 py-2 rounded-md shadow">
                  <Plus size={20} /> Add Folder
                </button>
              </div>
            </div>

            {/* Folders */}
            <h3 className="text-lg font-semibold mb-3">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {folders.map((folder, index) => (
                <div
                key={index}
                className="bg-gray-100 flex items-center gap-3 p-4 shadow-sm rounded-md border border-gray-300 cursor-pointer hover:bg-gray-200"
                >
                <Folder size={28} className="text-blue-600 flex-shrink-0 w-7 h-7" />
                <span className="font-medium text-gray-800 truncate flex-1">
                {folder}
                </span>
                </div>
                ))}
            </div>

            {/* Files */}
            <h3 className="text-lg font-semibold mb-3">Files</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="bg-gray-100 p-3 shadow-sm rounded-md border border-gray-300 hover:bg-gray-200 cursor-pointer"
                >
                  <FileText size={24} className="text-gray-600 mb-2" />
                  <p className="text-sm font-medium text-gray-800">{file}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
