// src/layout/create_template/headerFooterPanel.jsx
import React, { useState, useEffect } from "react";

const SLU_LOGO_SRC = "/assets/images/slu-logo.png"
const CICM_LOGO_SRC = "/assets/images/cicm-logo.png"

export default function HeaderFooterPanel({ value, onChange }) {
  // guard against null/undefined
  const v = value ?? {};

  const [showSLULogo, setShowSLULogo] = useState(!!v.showSLULogo);
  const [showCICMLogo, setShowCICMLogo] = useState(!!v.showCICMLogo);

  // keep local state in sync if parent updates `value`
  useEffect(() => {
    setShowSLULogo(!!(v.showSLULogo));
    setShowCICMLogo(!!(v.showCICMLogo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.showSLULogo, v.showCICMLogo]);

  // notify parent on any change
  useEffect(() => {
    onChange?.({
      showSLULogo,
      showCICMLogo,
      assets: { slu: SLU_LOGO_SRC, cicm: CICM_LOGO_SRC },
    });
  }, [showSLULogo, showCICMLogo, onChange]);

  return (
    <div className="p-5 bg-white rounded-2xl shadow-md w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Header & Footer Settings</h2>
      <p className="text-sm text-gray-500 mb-4">Toggle which logos should appear in your document header.</p>

      <div className="space-y-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showSLULogo}
            onChange={(e) => setShowSLULogo(e.target.checked)}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="text-gray-700 font-medium">Show SLU Logo</span>
        </label>
        {showSLULogo && (
          <div className="ml-8">
            <img src={SLU_LOGO_SRC} alt="SLU Logo" className="h-12 object-contain mt-2" />
          </div>
        )}

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showCICMLogo}
            onChange={(e) => setShowCICMLogo(e.target.checked)}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="text-gray-700 font-medium">Show CICM Logo</span>
        </label>
        {showCICMLogo && (
          <div className="ml-8">
            <img src={CICM_LOGO_SRC} alt="CICM Logo" className="h-12 object-contain mt-2" />
          </div>
        )}
      </div>
    </div>
  );
}
