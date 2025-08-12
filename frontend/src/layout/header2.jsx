// header for creating templates in document controller
import { useNavigate } from 'react-router-dom';
import naviLogo from '../assets/images/navilogo.png';
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export default function Header2({ title, setTitle, user, onSubmitForApproval, saving, lastSavedAt, dirty, templateStatus='draft', approvers=[], loadingApprovers=false, reviewNotes=[], assignedIds=[] }) {
  const navigate = useNavigate();
  // Determine button presentation based on status
  const statusConfig = () => {
    switch (templateStatus) {
      case 'draft':
        return {
          label: 'Submit for Approval',
          disabled: saving,
          onClick: onSubmitForApproval,
          className: 'bg-[#063c8d] hover:bg-[#052c6d] text-white',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )
        };
      case 'pending':
        return {
          label: 'Pending Approval',
            disabled: true,
            onClick: undefined,
            className: 'bg-yellow-500/90 text-white cursor-not-allowed',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6l3 3" />
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
              </svg>
            )
        };
      case 'approved':
        return {
          label: 'Approved',
          disabled: true,
          onClick: undefined,
          className: 'bg-green-600 text-white cursor-default',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          )
        };
      case 'published':
        return {
          label: 'Published',
          disabled: true,
          onClick: undefined,
          className: 'bg-blue-600 text-white cursor-default',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8"/></svg>
          )
        };
      default:
        return { label: templateStatus, disabled: true, onClick: undefined, className: 'bg-gray-500 text-white', icon: null };
    }
  };
  const action = statusConfig();
  return (
    <div>
      <div className="h-4 bg-[#063c8d] w-full" /> 
      <div className="flex items-center justify-between bg-[#f3f3f3] px-8 py-3 border-b border-gray-200">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <img src={naviLogo} alt="Logo" className="w-15 h-10" onClick={() => navigate('/document-controller/templates')} />
          {/* Title with edit icon */}
          <div className="flex items-center ">
            <input
              className={`bg-transparent text-xl font-medium text-gray-800 outline-none border-none ${templateStatus!=='draft' ? 'cursor-not-allowed opacity-80' : ''}`}
              value={title}
              onChange={e => templateStatus==='draft' && setTitle(e.target.value)}
              placeholder="Untitled Template"
              readOnly={templateStatus!=='draft'}
            />
            <svg 
              className={`w-5 h-5 ${templateStatus==='draft' ? 'text-gray-500 cursor-pointer hover:text-gray-700' : 'text-gray-400 cursor-not-allowed'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              title="Edit title"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
              />
            </svg>
          </div>
        </div>

        {/* Action buttons */}
  <div className="flex items-center gap-3">
           <div className="flex flex-col items-start">
            {lastSavedAt && (
              <span className="text-[10px] text-gray-500 leading-tight">Saved {lastSavedAt.toLocaleTimeString()}</span>
            )}
            {dirty && !saving && (
              <span className="text-[10px] text-amber-600 leading-tight">Unsaved changes</span>
            )}
            {saving && (
              <span className="text-[10px] text-blue-600 leading-tight">Saving...</span>
            )}
          </div>
          {/* history btn */}
          <button 
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="History"
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="#7D7D7D" d="M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z"/></svg>
          </button>
        
          {/* status/action btn with hoverable detail */}
          <div className="relative group">
            <button 
              disabled={action.disabled && templateStatus!=='draft'}
              onClick={action.onClick}
              className={`${action.className} rounded px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-70`}
            >
              {action.icon}
              {action.label}
              <svg className="w-3 h-3 text-white/80" viewBox="0 0 16 16" fill="currentColor"><path d="M8 11.5l-5-5h10l-5 5z"/></svg>
            </button>
            {/* Popover */}
            <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute right-0 mt-2 w-80 z-50">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-xs text-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Status Details</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">{templateStatus}</span>
                </div>
                {templateStatus==='draft' && (
                  <p className="text-[11px] leading-relaxed">Draft mode. Make edits then submit for approval. Only you can see this draft.</p>
                )}
                {templateStatus==='pending' && (
                  <p className="text-[11px] leading-relaxed">Awaiting approval from listed approvers. You will be notified when a decision is made.</p>
                )}
                {templateStatus==='approved' && (
                  <p className="text-[11px] leading-relaxed">Approved. Ready for publishing or assignment.</p>
                )}
                {templateStatus==='published' && (
                  <p className="text-[11px] leading-relaxed">Published. This version is live for use.</p>
                )}
                {/* Approvers */}
                <div>
                  <div className="font-medium mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8zm0 0c-4.418 0-8 2.239-8 5v2h9m8-9a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    Approvers
                  </div>
                  {loadingApprovers && <div className="text-[11px] italic text-gray-500">Loading approvers...</div>}
                  {!loadingApprovers && approvers.length===0 && <div className="text-[11px] italic text-gray-400">None found (Secretary / Dean)</div>}
                  <div className="flex flex-col gap-1">
                    {approvers.map(a => (
                      <div key={a._id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded px-2 py-1">
                        <span className="font-medium text-[11px]">{a.firstname} {a.lastname}</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">{a.role.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Review Notes */}
                {reviewNotes && reviewNotes.length>0 && (
                  <div>
                    <div className="font-medium mb-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 5l-5-5H9a5 5 0 01-5-5V7a5 5 0 015-5h6a5 5 0 015 5v4a5 5 0 01-5 5h-2z"/></svg>
                      Review Notes
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-auto pr-1">
                      {reviewNotes.map((n,i)=> (
                        <li key={i} className="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[11px] leading-snug">
                          {n.note || n.message || (typeof n === 'string' ? n : 'Note')}
                          {n.author && <span className="ml-1 text-[10px] text-amber-700 italic">- {n.author}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Assignment */}
                {assignedIds && assignedIds.length>0 && (
                  <div>
                    <div className="font-medium mb-1 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9l-6 6-6-6"/></svg>
                      Assigned Users
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {assignedIds.slice(0,6).map((id,i)=>(
                        <span key={id} className="bg-blue-50 border border-blue-200 text-blue-700 rounded px-2 py-0.5 text-[10px]">{id.substring(0,6)}{id.length>6?'…':''}</span>
                      ))}
                      {assignedIds.length>6 && <span className="text-[10px] text-gray-500">+{assignedIds.length-6} more</span>}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100">Hover to view details. Actions appear based on status.</div>
              </div>
            </div>
          </div>
         
          
          {/* share btn */}
          <div className="relative">
            <button className="bg-[#063c8d] text-white rounded px-4 py-2 text-sm font-semibold hover:bg-[#052c6d] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </button>
          </div>
          
          {/* profile picture*/}
          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center shadow overflow-hidden">
            <img
              src={user && user.profile_picture ? `${API_URL}${user.profile_picture}` : '/default-avatar.png'}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}