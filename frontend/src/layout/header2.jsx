// header for creating templates in document controller
import { useNavigate } from 'react-router-dom';
import naviLogo from '../assets/images/navilogo.png';
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
export default function Header2({ title, setTitle, user }) {
  const navigate = useNavigate();
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
              className="bg-transparent text-xl font-medium text-gray-800 outline-none border-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Untitled Template"
            />
            <svg 
              className="w-5 h-5 text-gray-500 cursor-pointer hover:text-gray-700" 
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
          {/* history btn */}
          <button 
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            title="History"
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24"><path fill="#7D7D7D" d="M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z"/></svg>
          </button>
          
          {/* publish btn */}
          <button className="bg-[#063c8d] text-white rounded px-4 py-2 text-sm font-semibold hover:bg-[#052c6d] flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Publish
          </button>
          
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