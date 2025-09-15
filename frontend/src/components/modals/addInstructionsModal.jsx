import React, { useState, useEffect } from 'react';
import { addTemplateNoteAPI } from '../../api/documentContollerAPI';
import { FileText, X, Plus, AlertCircle, MessageSquare } from 'lucide-react';

export default function AddInstructionsModal ({ 
  isOpen,
  onClose, 
  currentInstructions, 
  onUpdate, 
  templateTitle, 
  templateId
 }){
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setInstructions(currentInstructions || '');
      setCharacterCount((currentInstructions || '').length);
    }
  }, [isOpen, currentInstructions]);

  const validateInstructions = () => {
    const newErrors = {};
    
    if (!instructions.trim()) {
      newErrors.instructions = 'Instructions cannot be empty';
    } else if (instructions.trim().length < 10) {
      newErrors.instructions = 'Instructions must be at least 10 characters long';
    } else if (instructions.length > 2000) {
      newErrors.instructions = 'Instructions must be less than 2000 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateInstructions()) return;
    setIsSubmitting(true);
    try {
      if (!templateId) {
        throw new Error('Template ID is required to add instructions.');
      }
      const res = await addTemplateNoteAPI(templateId, instructions.trim());
      if (typeof onUpdate === 'function') {
        await onUpdate(res);
      }
      onClose();
    } catch (error) {
      console.error('Error updating instructions:', error);
      setErrors({ instructions: 'Failed to update instructions. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setInstructions('');
    setCharacterCount(0);
    setErrors({});
    onClose();
  };

  const handleInstructionsChange = (e) => {
    const value = e.target.value;
    setInstructions(value);
    setCharacterCount(value.length);
    
    // Clear errors as user types
    if (errors.instructions) {
      setErrors(prev => ({ ...prev, instructions: '' }));
    }
  };

  // Quick instruction templates
  const instructionTemplates = [
    "Please review and provide feedback by the deadline.",
    "Ensure all sections are completed accurately.",
    "Follow the standard formatting guidelines.",
  ];

  const insertTemplate = (template) => {
    const newInstructions = instructions ? `${instructions}\n\n${template}` : template;
    setInstructions(newInstructions);
    setCharacterCount(newInstructions.length);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/50">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/50 to-neutral-50/50 rounded-t-2xl flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 bg-clip-text text-transparent mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              {currentInstructions ? 'Update Instructions' : 'Add Instructions'}
            </h2>
            <p className="text-sm text-slate-600">
              {templateTitle ? `For: ${templateTitle}` : 'Provide additional instructions for this template'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/60 rounded-lg p-1.5 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Instructions Display - PLEASE UPDATE THIS, call the instructions variable or which variable is used*/}
          {currentInstructions && (
            <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200/60 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-600" />
                Current Instructions
              </h4>
              <div className="text-sm text-slate-800 max-h-32 overflow-y-auto bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-blue-100/60 shadow-sm">
                {currentInstructions}
              </div>
            </div>
          )}

          {/* Instructions Form */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-slate-800">
                {currentInstructions ? 'Updated Instructions' : 'Instructions'} <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs font-medium ${characterCount > 2000 ? 'text-rose-500' : 'text-slate-500'}`}>
                {characterCount}/2000
              </span>
            </div>
            
            <div className="relative">
              <textarea
                className={`w-full px-4 py-3.5 bg-gradient-to-br from-slate-50/50 to-neutral-50/30 border-2 rounded-xl shadow-sm focus:outline-none focus:bg-white/90 focus:ring-2 focus:ring-indigo-300/20 focus:border-indigo-300 transition-all duration-200 resize-vertical min-h-[120px] backdrop-blur-sm ${
                  errors.instructions 
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
                placeholder="Enter detailed instructions, expectations, or additional context for this template..."
                value={instructions}
                onChange={handleInstructionsChange}
                rows={6}
                maxLength={2000}
              />
            </div>

            {/* Quick Instructions */}
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-slate-700">Quick Instructions:</h5>
              <div className="grid grid-cols-1 gap-2">
                {instructionTemplates.map((template, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => insertTemplate(template)}
                    className="text-left p-3 text-sm bg-gradient-to-r from-slate-50/80 to-neutral-50/60 hover:from-indigo-50/80 hover:to-blue-50/60 text-slate-700 hover:text-indigo-800 rounded-xl transition-all duration-200 border border-slate-200/50 hover:border-indigo-200 hover:shadow-sm backdrop-blur-sm group"
                  >
                    <Plus size={12} className="inline mr-2 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {errors.instructions && (
              <div className="p-3 bg-gradient-to-r from-rose-50/80 to-red-50/60 border border-rose-200/70 rounded-xl backdrop-blur-sm">
                <p className="text-sm text-rose-700 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {errors.instructions}
                </p>
              </div>
            )}
          </div>
        </div>

         <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !instructions.trim()}
            className="px-6 py-2 bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-700 hover:from-indigo-700 hover:via-indigo-700 hover:to-blue-800 rounded-md text-white font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileText size={16} />
            {isSubmitting ? 'Updating...' : currentInstructions ? 'Update Instructions' : 'Add Instructions'}
          </button>
        </div>
      </div>
    </div>
  );
};