import React from "react";
import { FileText } from "lucide-react";

export default function DocxThumbnail({ width = 120, height = 160 }) {
  return (
    <div
      style={{
        width: width,
        height: height,
        overflow: 'hidden',
        borderRadius: 8,
        background: '#f3f3f3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FileText size={48} color="#3b82f6" />
    </div>
  );
}
