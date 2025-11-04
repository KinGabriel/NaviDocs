import { useState, useEffect } from 'react';

export default function CreateTemplateModal({ 
  showModal, 
  onClose, 
  onSubmit, 
  loading = false,
  schoolIdentifiers = {},
  user 
}) {
  const school = user?.role?.school || user?.role;
  
  // Available options
  const getAvailableSchools = () => {
    const options = {
      'University-wide': 'VAA'  
    };
      options[school] = schoolIdentifiers[school] || school;
    return options;
  };

  const availableSchools = getAvailableSchools();
  
  // Default to University-wide 
  const defaultSchool = 'University-wide';

  // Form state
  const [templateForm, setTemplateForm] = useState({
    school_identifier: defaultSchool,
    title: '',
    document_size: 'legal'
  });

  // Update default school when modal opens
  useEffect(() => {
    if (showModal) {
      setTemplateForm(prev => ({
        ...prev,
        school_identifier: defaultSchool
      }));
    }
  }, [showModal, defaultSchool]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!templateForm.title.trim()) {
      alert('Title is required');
      return;
    }

    console.log('Submitting template form:', templateForm);
    
    // Convert University-wide to VAA for submission
    const submissionData = {
      ...templateForm,
      school_identifier: templateForm.school_identifier === 'University-wide' ? 'VAA' : templateForm.school_identifier,
      // Provide structured pageSetup upfront so the backend persists it directly
      pageSetup: {
        paperSize: templateForm.document_size?.toLowerCase() === 'letter'
          ? 'Letter'
          : templateForm.document_size?.toLowerCase() === 'legal'
          ? 'Legal'
          : 'A4',
        orientation: 'Portrait',
        margins: { top: 1, bottom: 1, left: 1, right: 1 },
      }
    };
    
    // Call the parent's onSubmit function with converted data
    await onSubmit(submissionData);
    
    // Reset form after successful submission
    setTemplateForm({
      school_identifier: defaultSchool,
      title: '',
      document_size: 'legal'
    });
  };

  const handleClose = () => {
    // Reset form when closing
    setTemplateForm({
      school_identifier: defaultSchool,
      title: '',
      document_size: 'legal'
    });
    onClose();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-lg w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Create New Template</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Scope *
            </label>
            <select
              value={templateForm.school_identifier}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, school_identifier: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(availableSchools).map(([name, code]) => (
                <option key={name} value={code}>{name}</option>
              ))}
            </select>
            
            {/* Show helpful info */}
            <p className="text-xs text-gray-500 mt-1">
              {templateForm.school_identifier === 'University-wide' 
                ? 'Template will be available university-wide'
                : `Template will be specific to ${templateForm.school_identifier}`
              }
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Title *
            </label>
            <input
              type="text"
              value={templateForm.title}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Course Syllabus, Student Enrollment Form"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Document Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Size
            </label>
            <select
              value={templateForm.document_size}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, document_size: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="letter">Letter (8.5 x 11)</option>
              <option value="legal">Legal (8.5 x 13)</option>
              <option value="A4">A4</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-md text-white transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </div>
              ) : (
                'Create Template'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}