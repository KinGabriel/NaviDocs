export default function Table2({ columns, data, noDataMessage = "No template available" }) {
  // Limit rows to max 7
  const visibleData = data.slice(0, 8);

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      {/* Remove fixed height and scrolling */}
      <div className="overflow-visible">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-[#f5f5f5] z-10">
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="py-3 px-4 text-left font-bold tracking-wide text-gray-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleData.length > 0 ? (
              visibleData.map((row, idx) => (
                <tr
                  key={row.id || row.email || idx}
                  className={`border-b border-gray-200 ${idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"
                    } hover:bg-gray-50`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="py-4 px-4">
                      {typeof col.render === "function"
                        ? col.render(row)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 px-4 text-center text-gray-500 italic"
                >
                  {noDataMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}