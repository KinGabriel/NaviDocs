import React, { useState } from "react";
import {
  Folder,
  MoreVertical,
  Download,
  Pencil,
  FolderCog,
  Trash2,
  Move,
} from "lucide-react";

export default function FolderComponent({
  folder,
  index,
  isMenuOpen,
  toggleMenu,
  onClick,
}) {
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);

  return (
    <div className="relative bg-gray-100 flex items-center justify-between px-5 py-4 shadow-sm rounded-lg border border-gray-300 hover:bg-gray-200 transition">
      {/* Folder Info */}
      <div
        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
        onClick={() => onClick(folder.name)}
        title={folder.name}
      >
        <Folder size={28} className="text-blue-600 flex-shrink-0" />
        <span className="font-medium text-gray-800 truncate">
          {folder.name}
        </span>
      </div>

      {/* 3-dots Menu */}
      <div className="relative flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMenu(index);
          }}
          className="p-1 rounded-full hover:bg-gray-300"
          aria-label="folder menu"
        >
          <MoreVertical size={18} className="text-gray-600" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50">
            <ul className="text-sm text-gray-700">
              {/* Download */}
              <li className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <Download size={16} className="text-gray-600" />
                Download
              </li>

              {/* Rename */}
              <li className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <Pencil size={16} className="text-gray-600" />
                Rename
              </li>

              {/* Organize (with sub-menu) */}
              <li
                className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onMouseEnter={() => setIsOrganizeOpen(true)}
                onMouseLeave={() => setIsOrganizeOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <FolderCog size={16} className="text-gray-600" />
                  Organize
                </div>
                <span className="text-gray-500 text-xs">▶</span>

                {/* Submenu */}
                {isOrganizeOpen && (
                  <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
                    <li className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                      <Move size={16} className="text-gray-600" />
                      Move
                    </li>
                  </ul>
                )}
              </li>

              {/* Remove */}
              <li className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer">
                <Trash2 size={16} className="text-red-600" />
                Remove
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
