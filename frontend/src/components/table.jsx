export default function Table({ columns, data }) {
  return (
    <div className="bg-white rounded shadow p-0 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-[#f5f5f5]">
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
          {data.map((row, idx) => (
            <tr
              key={row.id || row.email || idx}
              className={`border-b border-gray-200 ${
                idx % 2 === 0 ? "bg-white" : "bg-[#fafbfc]"
              } hover:bg-gray-50`}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4">
                  {typeof col.render === "function"
                    ? col.render(row)
                    : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}