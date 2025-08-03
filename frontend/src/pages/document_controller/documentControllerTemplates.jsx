import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar';
import useUser from '../../hooks/useUser'; 
import SearchBar from '../../components/searchbar';
import Dropdown from '../../components/dropdown';
import TemplateCard from '../../components/templatecard';
import CreateTemplateModal from '../../components/modals/createTemplateModal';

export default function DocumentControllerTemplates() {
  const user = useUser();
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); 

  // School identifiers for filtering, sorting, and modal
  const schoolIdentifiers = {
    'University Wide' : 'VAA',
    'SAMCIS': 'SMI',
    'STELA': 'STL',
  };

  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const handleModalSubmit = async (templateFormData) => {
    setLoading(true);
    try {
      // For draft templates, use the FM-XXX format but without sequential number
      const draftDocumentCode = `FM-${templateFormData.school_identifier}`;
      const templateData = {
        document_code: draftDocumentCode,
        isDraft: true, 
        revision_no: 0,
        effectivity: null,
        page_no: 1,
        title: templateFormData.title.trim(),
        document_size: templateFormData.document_size,
        // school_identifier: templateFormData.school_identifier,
        // sequential_number: null,
        margin: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1
        },
        created_by: user._id,
        created_at: new Date(),
        header: [], // TipTap JSON format
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Start typing your template content...'
                }
              ]
            }
          ]
        },
        footer: [], // TipTap JSON format
        status: {
          approved: false,
          published: false,
          draft: true,
          pending_approval: false,
          approved_by: null,
          approved_at: null,
          published_at: null,
          submitted_for_approval_at: null
        },
        approval_workflow: {
          required_approvers: [],
          current_step: 0,
          completed_approvals: []
        },
        assigned: []
      };

      // Call backend API to create draft template
      const response = await fetch('/api/templates/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create template');
      }

      const result = await response.json();
      console.log('Draft template created:', result);

      // Close modal
      setShowCreateModal(false);
      // Navigate to editor with the new template ID
      navigate(`/document-controller/create-template?templateId=${result.template._id}`);
      
    } catch (error) {
      console.error('Error creating template:', error);
      alert(`Failed to create template: ${error.message}`);
    } finally {

      setLoading(false);
    }
  };

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/templates', {
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-semibold mb-2 tracking-wide">TEMPLATES</h2>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            <div className="flex items-center gap-2 mb-4">
              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value="All"
                onChange={() => {}}
                width="w-50"
              />

              <Dropdown
                options={["A-Z", "Z-A"]}
                value="A-Z"
                onChange={() => {}}
                width="w-36"
              />

              <div className="flex-1 flex justify-start m-2">
                <div className="w-64">
                  <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {/* create template btn */}
              <div className="flex-1 flex justify-end">
                <button 
                  onClick={handleCreateTemplate}
                  className="flex items-center gap-2 bg-[#0035DA] hover:bg-[#043485] text-white font-semibold px-5 py-2 rounded shadow transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Template
                </button>
              </div>      
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {templates.map((template, i) => (
                <TemplateCard 
                  key={template._id || i} 
                  template={template}
                  onSelect={() => navigate(`/document-controller/create-template?templateId=${template._id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create Template Modal Component */}
      <CreateTemplateModal
        showModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleModalSubmit}
        loading={loading}
        schoolIdentifiers={schoolIdentifiers}
        user={user}
      />
    </div>
  );
}