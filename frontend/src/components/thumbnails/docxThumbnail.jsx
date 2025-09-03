import React from "react";
import { FileText } from "lucide-react";

export default function DocxThumbnail() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-hidden">
      <FileText
        className="w-14 h-14 text-blue-500" 
        style={{ transform: "scale(1.1)" }}
      />
    </div>
  );
}
