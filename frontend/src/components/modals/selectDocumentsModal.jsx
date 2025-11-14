import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, CheckCircle, FileText } from 'lucide-react';
import { listDocumentsAPI } from '../../api/documentsAPI';
import Loader from "../../components/loader";

export default function SelectDocumentsModal({
  isOpen,
  onClose,
  onSelectDocuments,
  userId
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = { limit: 100, page: 1 };
      // Add filter for current user's documents if needed
      const result = await listDocumentsAPI(params);

      let docList = [];
      if (result && Array.isArray(result.documents)) {
        docList = result.documents;
      } else if (result?.success && Array.isArray(result.data?.documents)) {
        docList = result.data.documents;
      }

      setDocuments(docList);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = selectedSchool === 'All' || doc.school === selectedSchool;
    return matchesSearch && matchesSchool;
  });

  const toggleDocSelection = (docId) => {
    setSelectedDocIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleConfirm = () => {
    const selectedDocs = documents.filter(doc =>
      selectedDocIds.includes(doc._id || doc.id)
    );
    onSelectDocuments(selectedDocs);
    onClose();
    // Reset selections
    setSelectedDocIds([]);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select Documents to Submit</h3>
            <p className="text-sm text-gray-600">
              Choose one or more documents from your library
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Selected count */}
          {selectedDocIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-semibold text-blue-900">
                {selectedDocIds.length} document{selectedDocIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedDocIds([])}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader message="Loading your documents..." />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">No documents found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const docId = doc._id || doc.id;
                const isSelected = selectedDocIds.includes(docId);

                return (
                  <div
                    key={docId}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    onClick={() => toggleDocSelection(docId)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <div className="mt-1">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                          {isSelected && <CheckCircle size={16} className="text-white" />}
                        </div>
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate mb-1">
                          {doc.title || 'Untitled Document'}
                        </h4>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {doc.status && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {doc.status}
                            </span>
                          )}
                          {doc.school && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {doc.school}
                            </span>
                          )}
                          {doc.createdAt && (
                            <span className="text-xs text-gray-500">
                              Created {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedDocIds.length === 0}
            className={`px-8 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDocIds.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            <CheckCircle size={18} />
            Select {selectedDocIds.length > 0 ? `(${selectedDocIds.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}