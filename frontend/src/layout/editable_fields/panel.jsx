import SectionHeader from "../../layout/editable_fields/sectionHeader";

export default function Panel({ number, title, color, fields, formData, onChange, onFocusField }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <SectionHeader
        number={number}
        title={title}
        color={color}
      />

      <div className="space-y-4 mt-4">
        {fields.map((field, idx) => {
          if (field.type === "input") {
            return (
              <div key={idx}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <input
                  type="text"
                  value={formData[field.name] || ""}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => onFocusField && onFocusField(field.name)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder={field.placeholder}
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={idx}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <textarea
                  value={formData[field.name] || ""}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => onFocusField && onFocusField(field.name)}
                  className="w-full p-2 border border-gray-300 rounded h-24 resize-none"
                  placeholder={field.placeholder}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
