import React, { useState } from "react";
import SectionHeader from "../../layout/editable_fields/sectionHeader";
import { saveFieldSuggestionAPI } from "../../api/documentsAPI";

export default function Panel({ number, title, color, fields, formData, onChange, onFocusField, user }) {
  // saving state and messages per field
  const [savingState, setSavingState] = useState({});
  const [saveMessage, setSaveMessage] = useState({}); 
  const [selectedScopes, setSelectedScopes] = useState({}); 

  const allowSchoolScope = (user) => {
    if (!user) return false;
    // Accept various shapes: role string, role object, or roles array
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'document_controller') return true;
    if (user.role && typeof user.role === 'object' && ((user.role.name && String(user.role.name).toLowerCase() === 'document controller') || (user.role.slug && String(user.role.slug).toLowerCase() === 'document_controller'))) return true;
    if (Array.isArray(user.roles) && (user.roles.includes('Document Controller') || user.roles.includes('document_controller'))) return true;
    return false;
  };

  const handleScopeChange = (fieldName, value) => {
    setSelectedScopes((s) => ({ ...s, [fieldName]: value }));
  };

  const handleSaveSuggestion = async (fieldName) => {
    const value = formData?.[fieldName];
    if (value === undefined || value === null || String(value).trim() === "") {
      setSaveMessage((m) => ({ ...m, [fieldName]: { type: 'error', text: 'Cannot save empty value' } }));
      setTimeout(() => setSaveMessage((m) => ({ ...m, [fieldName]: undefined })), 2500);
      return;
    }

    const scope = allowSchoolScope(user) ? (selectedScopes[fieldName] || 'user') : 'user';

    try {
      setSavingState((s) => ({ ...s, [fieldName]: true }));
      await saveFieldSuggestionAPI({ key: fieldName, value, scope });
      setSaveMessage((m) => ({ ...m, [fieldName]: { type: 'success', text: `Saved (${scope})` } }));
      setTimeout(() => setSaveMessage((m) => ({ ...m, [fieldName]: undefined })), 2500);
    } catch (err) {
      setSaveMessage((m) => ({ ...m, [fieldName]: { type: 'error', text: err?.message || 'Save failed' } }));
      setTimeout(() => setSaveMessage((m) => ({ ...m, [fieldName]: undefined })), 3500);
    } finally {
      setSavingState((s) => ({ ...s, [fieldName]: false }));
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <SectionHeader
        number={number}
        title={title}
        color={color}
      />

      <div className="space-y-4 mt-4">
        {fields.map((field, idx) => {
          const fieldValue = formData?.[field.name] || "";
          return (
            <div key={idx}>
              <label className="block text-sm font-medium mb-1">{field.label}</label>
              {field.type === 'input' ? (
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => onFocusField && onFocusField(field.name)}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder={field.placeholder}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={fieldValue}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => onFocusField && onFocusField(field.name)}
                  className="w-full p-2 border border-gray-300 rounded h-24 resize-none"
                  placeholder={field.placeholder}
                />
              ) : null}

              {/* Controls: Save suggestion (scope-aware) */}
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => handleSaveSuggestion(field.name)}
                  disabled={!!savingState[field.name]}
                  className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${savingState[field.name] ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-wait' : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'}`}
                >
                  {savingState[field.name] ? 'Saving…' : 'Save field'}
                </button>

                {/* If user can save at school scope, show a small selector to pick scope per-field */}
                {allowSchoolScope(user) ? (
                  <select
                    value={selectedScopes[field.name] || 'user'}
                    onChange={(e) => handleScopeChange(field.name, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="user">Save to me</option>
                    <option value="school">Save to school</option>
                  </select>
                ) : (
                  <span className="text-xs text-gray-400">(saves to you)</span>
                )}

                <div className="text-sm">
                  {saveMessage[field.name] ? (
                    <span className={saveMessage[field.name].type === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {saveMessage[field.name].text}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
