export default function Table({ columns, data, noDataMessage = "No template available" }) {
  return (
    <div className="bg-white rounded shadow overflow-hidden">
      {/* Scrollable container */}
      <div className="max-h-[290px] overflow-y-auto">
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
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr
                  key={row.id || row.email || idx}
                  className={`border-b border-gray-200 ${
                    idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"
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
