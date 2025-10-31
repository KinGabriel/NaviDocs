import React, { useState } from "react";
import SectionHeader from "../../layout/editable_fields/sectionHeader";
import { saveFieldSuggestionAPI } from "../../api/documentsAPI";
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Panel({
  number,
  title,
  color,
  fields,
  formData,
  onChange,
  onFocusField,
  user,
  duplicateCounts = {},
  duplicateIndices = {},
  onCycleDuplicate
}) {
  const [savingState, setSavingState] = useState({});
  const [saveMessage, setSaveMessage] = useState({});
  const [selectedScopes, setSelectedScopes] = useState({});

  const allowSchoolScope = (user) => {
    if (!user) return false;
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'document_controller') return true;
    if (
      user.role &&
      typeof user.role === 'object' &&
      (
        (user.role.name && String(user.role.name).toLowerCase() === 'document controller') ||
        (user.role.slug && String(user.role.slug).toLowerCase() === 'document_controller')
      )
    ) return true;
    if (
      Array.isArray(user.roles) &&
      (user.roles.includes('Document Controller') || user.roles.includes('document_controller'))
    ) return true;
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
          const dupCount = duplicateCounts[field.name] || 0;
          const dupIndex = duplicateIndices[field.name] || 0;

          return (
            <div key={idx}>
              <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                <span>{field.label}</span>

                {dupCount > 1 && (
                  <div className="inline-flex items-center text-xs text-gray-600 space-x-2">
                    <button
                      type="button"
                      onClick={() => onCycleDuplicate && onCycleDuplicate(field.name, 'prev')}
                      className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      title={`Previous occurrence (${dupIndex === 0 ? dupCount : dupIndex} of ${dupCount})`} 
                      aria-label={`Previous occurrence of ${field.name}`}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-medium text-gray-700">{dupIndex + 1} / {dupCount}</span>

                    <button
                      type="button"
                      onClick={() => onCycleDuplicate && onCycleDuplicate(field.name, 'next')}
                      className="inline-flex items-center justify-center w-7 h-7 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      title={`Next occurrence (${dupIndex + 2 > dupCount ? 1 : dupIndex + 2} of ${dupCount})`}
                      aria-label={`Next occurrence of ${field.name}`}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </label>

              {field.type === 'input' ? (
                <input 
                  type="text"
                  value={fieldValue}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => {
                    if (onFocusField) onFocusField(field.name);
                  }}
                  onClick={() => {
                    if (onFocusField) onFocusField(field.name);
                  }}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={field.placeholder}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  value={fieldValue}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  onFocus={() => {
                    if (onFocusField) onFocusField(field.name);
                  }}
                  onClick={() => {
                    if (onFocusField) onFocusField(field.name);
                  }}
                  className="w-full p-2 border border-gray-300 rounded h-24 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={field.placeholder}
                />
              ) : null}

              {/* Controls under each field */}
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <button
                  onClick={() => handleSaveSuggestion(field.name)}
                  disabled={!!savingState[field.name]}
                  className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    savingState[field.name]
                      ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-wait'
                      : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'
                  }`}
                >
                  {savingState[field.name] ? 'Saving…' : 'Save field'}
                </button>

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
