import React, { useState } from 'react';

export default function DateFormatPanel() {
  const [selectedFormat, setSelectedFormat] = useState('numeric');
  const [numericFormat, setNumericFormat] = useState('MM/DD/YYYY');
  const [useLeadingZeros, setUseLeadingZeros] = useState(true);

  const [writtenMonth, setWrittenMonth] = useState('August');
  const [writtenDay, setWrittenDay] = useState('8');
  const [writtenYear, setWrittenYear] = useState('2025');

  const numericOptions = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const days = Array.from({ length: 31 }, (_, i) =>
    useLeadingZeros && i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
  );
  const years = ['2020','2021','2022','2023','2024', '2025', '2026', '2027'];

  const previewNumeric = () => {
    const day = useLeadingZeros ? '08' : '8';
    const month = useLeadingZeros ? '08' : '8';
    const year = '2025';

    switch (numericFormat) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return '';
    }
  };

  const previewWritten = () => {
    return `${writtenMonth} ${writtenDay}, ${writtenYear}`;
  };

  return (
    <div className="max-w-xl mx-auto ml-3 mr-3">
      <h2 className="text-xl font-semibold mb-4">Select Date Format</h2>

      {/* Selection of Date Format */}
      <div className="flex gap-6 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="format"
            checked={selectedFormat === 'numeric'}
            onChange={() => setSelectedFormat('numeric')}
          />
          <span>Numeric</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="format"
            checked={selectedFormat === 'written'}
            onChange={() => setSelectedFormat('written')}
          />
          <span>Written</span>
        </label>
      </div>

      {/* Numeric Format */}
      {selectedFormat === 'numeric' && (
        <>
          <div className="mb-4">
            <label className="block font-medium mb-2">Numeric Date Format</label>
            <select
              className="w-full border rounded px-4 py-2"
              value={numericFormat}
              onChange={(e) => setNumericFormat(e.target.value)}
            >
              {numericOptions.map((format) => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={useLeadingZeros}
              onChange={(e) => setUseLeadingZeros(e.target.checked)}
            />
            <span>Use leading zeros for day/month</span>
          </label>

          <p className="text-sm text-gray-600">
            <strong>Preview:</strong> {previewNumeric()}
          </p>
        </>
      )}

      {/* Written Format */}
      {selectedFormat === 'written' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 w-80">
            <select
              className="border rounded px-2 py-2 "
              value={writtenMonth}
              onChange={(e) => setWrittenMonth(e.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-2"
              value={writtenDay}
              onChange={(e) => setWrittenDay(e.target.value)}
            >
              {days.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-2"
              value={writtenYear}
              onChange={(e) => setWrittenYear(e.target.value)}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Preview:</strong> {previewWritten()}
          </p>
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6 pt-4">
        <button className="text-[#063c8d] font-semibold hover:underline">
          Cancel
        </button>
        <button className="bg-[#063c8d] text-white rounded-full px-8 py-2 font-semibold hover:bg-[#052c6d] transition">
          Apply
        </button>
      </div>
    </div>
  );
}