import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { X, Info } from "lucide-react";

function SimpleMessageModalContent({
  open,
  onClose,
  title = "Notice",
  message = "",
  buttonLabel = "OK",
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => setIsVisible(open), [open]);

  // ESC to close
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? "opacity-50" : "opacity-0"
          }`}
        onClick={onClose}
      />

      {/* Modal box */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-sm text-gray-700">
          <p className="leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm hover:shadow"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimpleMessageModal(props) {
  return ReactDOM.createPortal(
    <SimpleMessageModalContent {...props} />,
    document.body
  );
}