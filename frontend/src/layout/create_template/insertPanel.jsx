// src/layout/create_template/insertPanel.jsx
import React from "react";

export default function InsertPanel({ editor }) {
  // ---------- Compute usable page inner width (for image sizing) ----------
  const getUsablePageContentWidth = () => {
    const pageEl =
      editor?.view?.dom?.closest?.(".nd-page") ||
      document.querySelector(".nd-page");

    if (!pageEl) {
      const rs = getComputedStyle(document.documentElement);
      const pageWidthPx =
        parseFloat(rs.getPropertyValue("--nd-page-width")) || 800;
      const padL =
        parseFloat(rs.getPropertyValue("--nd-margin-left")) || 96;
      const padR =
        parseFloat(rs.getPropertyValue("--nd-margin-right")) || 96;
      return Math.max(100, Math.round(pageWidthPx - padL - padR));
    }

    const cs = getComputedStyle(pageEl);
    const rectW = pageEl.getBoundingClientRect().width;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    return Math.max(100, Math.round(rectW - padL - padR));
  };

  // ---------- Image upload (uses ImagePlus -> setImage) ----------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();

      img.onload = () => {
        const usableW = getUsablePageContentWidth();
        const natW = img.naturalWidth || 1;
        const natH = img.naturalHeight || 1;
        const scale = Math.min(1, usableW / natW);
        const width = Math.round(natW * scale);
        const height = Math.round(nH * scale);

        editor
          .chain()
          .focus()
          .setImage({
            src,
            width,
            height,
            keepAspect: true,
            wrapMode: "break",
          })
          .run();
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Image Upload */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Image</h2>
        <label className="w-full bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-gray-200">
          <span className="text-gray-600">Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
