import React, { useState } from "react";

export default function DateFormatPanel() {
  const [formatType, setFormatType] = useState("numeric");
  const [numericFormat, setNumericFormat] = useState("MM/DD/YYYY");
  const [leadingZero, setLeadingZero] = useState(true);

  const sampleDate = new Date(2026, 0, 12); 

  const formatDatePreview = () => {
    let day = sampleDate.getDate();
    let month = sampleDate.getMonth() + 1;
    let year = sampleDate.getFullYear();

    if (leadingZero) {
      day = day.toString().padStart(2, "0");
      month = month.toString().padStart(2, "0");
    }

    switch (numericFormat) {
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;
      case "DD/MM/YYYY":
        return `${day}/${month}/${year}`;
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      default:
        return `${month}/${day}/${year}`;
    }
  };

  return (
    <div className="flex">
      <main className="flex-1 p-8">
        <h2 className="text-xl font-semibold mb-6">Select Date Format</h2>

        {/* Select Format Type */}
        <div className="mb-6">
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formatType === "numeric"}
                onChange={() => setFormatType("numeric")}
                className="accent-blue-600"
              />
              Numeric
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formatType === "written"}
                onChange={() => setFormatType("written")}
                className="accent-blue-600"
              />
              Written
            </label>
          </div>
        </div>

        {/* Numeric Date Format */}
        {formatType === "numeric" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="text-md font-medium mb-2">Numeric Date Format</h3>
            <select
              value={numericFormat}
              onChange={(e) => setNumericFormat(e.target.value)}
              className="border px-4 py-2 rounded-lg w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>

            {/* Checkbox */}
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={leadingZero}
                onChange={() => setLeadingZero(!leadingZero)}
                className="accent-blue-600"
              />
              Use leading zeros for day/month
            </label>

            <div className="mt-4">
              <span className="text-sm text-gray-600">Preview:</span>
              <div className="mt-1 px-4 py-2  inline-block font-mono">
                {formatDatePreview()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
